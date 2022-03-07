import { EngineInterface } from '../engine-interface'
import * as policies from '../../policy.json'
import { EngineRequest } from '../../engine-request'
import { C7nFilterBuilder } from '../../filters/c7n-filter-builder'
import { C7nExecutor } from '../../c7n-executor'
import { Response } from '../../responses/response'
import { Vm } from '../../domain/types/gcp/vm'
import { StringHelper } from '../../helpers/string-hepler'
import { Label } from '../../domain/types/gcp/shared/label'
import { Disks } from '../../domain/types/gcp/disks'
import { Sql } from '../../domain/types/gcp/sql'

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
      const items = responseJson.map((item: any) => new Vm(
        item.name,
        StringHelper.splitAndGetAtIndex(item.machineType, '/', -1),
        item.creationTimestamp,
        StringHelper.splitAndGetAtIndex(item.zone, '/', -1),
        undefined,
        undefined,
        Label.createInstances(item.labels)
      ))
      // await this.awsPriceCalculator.putEbsPrices(ebsItems)
      return new Response<Type>(items)
    }

    private async generateDisksResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const items = responseJson.map((item: any) => new Disks(
        item.name,
        StringHelper.splitAndGetAtIndex(item.type, '/', -1),
        item.users?.length > 0,
        item.status,
        (parseFloat(item.sizeGb) | 0) * 1073741824,
        item.creationTimestamp,
        StringHelper.splitAndGetAtIndex(item.zone, '/', -1),
        undefined,
        Label.createInstances(item.labels)
      ))
      // await this.awsPriceCalculator.putEbsPrices(ebsItems)
      return new Response<Type>(items)
    }

    private async generateSqlResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const items = responseJson.map((item: any) => new Sql(
        item.name,
        item.databaseVersion,
        'secondaryGceZone' in item,
        item.region,
        undefined,
        Label.createInstances(item.settings?.userLabels),
        item.project
      ))
      // await this.awsPriceCalculator.putEbsPrices(ebsItems)
      return new Response<Type>(items)
    }

    private getPolicy (policyName: string) {
      // @ts-ignore
      return JSON.parse(JSON.stringify(Object.assign({}, policies[policyName])))
    }
}
