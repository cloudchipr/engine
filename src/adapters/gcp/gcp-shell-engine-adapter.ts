import { EngineInterface } from '../engine-interface'
import * as policies from '../../policy.json'
import { Ebs } from '../../domain/types/aws/ebs'
import { EngineRequest } from '../../engine-request'
import { C7nFilterBuilder } from '../../filters/c7n-filter-builder'
import { C7nExecutor } from '../../c7n-executor'
import { Response } from '../../responses/response'
import { Ec2 } from '../../domain/types/aws/ec2'
import { Elb } from '../../domain/types/aws/elb'
import { Eip } from '../../domain/types/aws/eip'
import { Rds } from '../../domain/types/aws/rds'
import { TagsHelper } from '../../helpers/tags-helper'
import { MetricsHelper } from '../../helpers/metrics-helper'
import { Vm } from '../../domain/types/gcp/vm'
import { StringHelper } from '../../helpers/string-hepler'
import { Label } from '../../domain/types/gcp/shared/label'

export class GcpShellEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly custodianExecutor: C7nExecutor;
    constructor (custodian: string, custodianOrg?: string) {
      this.custodianExecutor = new C7nExecutor(custodian, custodianOrg)
    }

    async execute (request: EngineRequest): Promise<Response<Type>> {
      const subCommand = request.subCommand.getValue()

      const generateResponseMethodName = GcpShellEngineAdapter.getResponseMethodName(subCommand)
      this.validateRequest(generateResponseMethodName)

      // let policyName: string, policy: any
      const [policyName, policy] = this.getDefaultPolicy(request)
      const filters: object = request.parameter.filter?.build(new C7nFilterBuilder(request.command, request.subCommand))

      if (filters && Object.keys(filters).length) {
        if (typeof policy.policies[0].filters === 'undefined') {
          policy.policies[0].filters = []
        }
        policy.policies[0].filters.push(filters)
      }

      // execute custodian command and return response
      const response = await this.executeC7nPolicy(policy, policyName, request, 'cloud-test-340820')
      return (this as any)[generateResponseMethodName](response)
    }

    private executeC7nPolicy (policy: string, policyName: string, request: EngineRequest, currentAccount: string| undefined) {
      return this.custodianExecutor.execute(
        policy,
        policyName,
        request.parameter.regions,
        currentAccount,
        [],
        request.outputDirectory
      )
    }

    private getDefaultPolicy (request: EngineRequest) : [string, any] {
      const policyName = `gcp-${request.subCommand.getValue()}-${request.command.getValue()}`

      const policy: any = this.getPolicy(policyName)
      GcpShellEngineAdapter.validatePolicyName(policyName)

      return [policyName, policy]
    }

    private validateRequest (name: string) {
      if (typeof (this as any)[name] !== 'function') {
        throw Error('Invalid GCP subcommand provided: ' + name)
      }
    }

    private static validatePolicyName (policy: string) {
      if (!(policy in policies)) {
        throw new Error(`Invalid policy name provided: ${policy}`)
      }
    }

    private static getResponseMethodName (subCommand: string): string {
      return `generate${GcpShellEngineAdapter.capitalizeFirstLetter(subCommand)}Response`
    }

    private static capitalizeFirstLetter (str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1)
    }

    private async generateVmResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const vmItems = responseJson.map(
        (vmResponseItemJson: {
                name: string;
                machineType?: string;
                creationTimestamp?: string;
                zone?: string;
                labels?: any
            }) => {
          return new Vm(
            vmResponseItemJson.name,
            StringHelper.splitAndGetAtIndex(vmResponseItemJson.machineType, '/', -1),
            vmResponseItemJson.creationTimestamp,
            StringHelper.splitAndGetAtIndex(vmResponseItemJson.zone, '/', -1),
            undefined,
            undefined,
            Label.createInstances(vmResponseItemJson.labels)
          )
        }
      )
      // await this.awsPriceCalculator.putEbsPrices(ebsItems)
      return new Response<Type>(vmItems)
    }

    private getPolicy (policyName: string) {
      // @ts-ignore
      return JSON.parse(JSON.stringify(Object.assign({}, policies[policyName])))
    }
}
