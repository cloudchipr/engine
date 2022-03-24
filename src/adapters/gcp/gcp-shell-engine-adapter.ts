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
import { Lb } from '../../domain/types/gcp/lb'
import { Eip } from '../../domain/types/gcp/eip'
import { MetricsHelper } from '../../helpers/metrics-helper'
import { FilterInterface } from '../../filter-interface'
import { FilterResource } from '../../filters/filter-resource'
import { Command } from '../../command'
import { GcpSubCommand } from './gcp-sub-command'
import { FilterExpression } from '../../filters/filter-expression'
import { Operators } from '../../filters/operators'
import GcpResourceClient from './clients/gcp-resource-client'

export class GcpShellEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly custodianExecutor: C7nExecutor
    private readonly gcpResourceClient: GcpResourceClient
    private project: string = 'N/A'

    constructor (custodian: string, custodianOrg?: string) {
      this.custodianExecutor = new C7nExecutor(custodian, custodianOrg)
      this.gcpResourceClient = new GcpResourceClient()
    }

    async execute (request: EngineRequest): Promise<Response<Type>> {
      const command = request.command.getValue()
      const subCommand = request.subCommand.getValue()

      const generateResponseMethodName = GcpShellEngineAdapter.getResponseMethodName(subCommand)
      this.validateRequest(generateResponseMethodName)

      const filterList = request.parameter.filter
      if (GcpShellEngineAdapter.shouldOverrideNlbAlbFilter(filterList, command, subCommand)) {
        const potentialElbGarbage = await this.getPotentialLbGarbage(request)
        const instanceFilter = filterList.getFilterExpressionByResource(FilterResource.INSTANCES)
        const newFilterExpression = new FilterExpression(
          FilterResource.LOAD_BALANCER_NAME,
          instanceFilter?.operator === Operators.IsEmpty ? Operators.In : Operators.NotIn,
          '[' + potentialElbGarbage.map(x => '"' + x + '"').join(',') + ']'
        )
        filterList.replaceFilterExpressionByResource(FilterResource.INSTANCES, newFilterExpression)
      }

      const [policyName, policy] = this.getDefaultPolicy(request)
      const filters: object = filterList.build(new C7nFilterBuilder(request.command, request.subCommand))

      if (filters && Object.keys(filters).length) {
        if (typeof policy.policies[0].filters === 'undefined') {
          policy.policies[0].filters = []
        }
        policy.policies[0].filters.push(filters)
      }

      // execute custodian command and return response
      const response = await this.executeC7nPolicy(policy, policyName, request)
      if (response.length > 0) {
        this.project = await this.gcpResourceClient.getProject()
      }
      return (this as any)[generateResponseMethodName](response)
    }

    private static shouldOverrideNlbAlbFilter (filterList: FilterInterface, command: string, subCommand: string): boolean {
      return !filterList.isEmpty() &&
        filterList.getFilterExpressionByResource(FilterResource.INSTANCES) !== undefined &&
        command === Command.COLLECT_COMMAND &&
        subCommand === GcpSubCommand.LB_SUBCOMMAND
    }

    private executeC7nPolicy (policy: string, policyName: string, request: EngineRequest) {
      return this.custodianExecutor.execute(
        policy,
        policyName,
        request.parameter.regions,
        undefined,
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

    private async getPotentialLbGarbage (request: EngineRequest) : Promise<string[]> {
      const policyNameLb = 'gcp-lb-collect-all'
      const policyNameTargetPool = 'gcp-lb-target-pool-collect'
      const policyNameVm = 'gcp-vm-collect'

      const response = await Promise.all([
        this.executeC7nPolicy(this.getPolicy(policyNameLb), policyNameLb, request),
        this.executeC7nPolicy(this.getPolicy(policyNameTargetPool), policyNameTargetPool, request),
        this.executeC7nPolicy(this.getPolicy(policyNameVm), policyNameVm, request)
      ])

      const targetPoolInstances: any = {}
      // Generate an object that has key(s) (target pool name) and value(s) (target pool is attached to at least one running VM or not)
      response[1].forEach((targetPool: any) => {
        let instanceFound = false
        for (const instance of (targetPool.instances || [])) {
          const instanceName = StringHelper.splitAndGetAtIndex(instance, '/', -1)
          if (response[2].filter((vm: any) => vm.name === instanceName).length > 0) {
            instanceFound = true
            break
          }
        }
        targetPoolInstances[targetPool.name] = instanceFound
      })

      const potentialGarbageLb: string[] = []
      // if the LB has a target pool that is not assigned to a running VM, consider it as a potential garbage
      response[0].forEach((r: any) => {
        const targetType = StringHelper.splitAndGetAtIndex(r.target, '/', -2)
        const targetName = StringHelper.splitAndGetAtIndex(r.target, '/', -1)
        if (targetType === 'targetPools' && targetName !== undefined && targetPoolInstances[targetName] !== true) {
          potentialGarbageLb.push(r.name)
        }
      })

      return potentialGarbageLb
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
        StringHelper.splitAndGetAtIndex(item.zone, '/', -1) || '',
        StringHelper.splitAndGetAtIndex(item.machineType, '/', -1),
        item.creationTimestamp,
        MetricsHelper.getGcpCpuUtilization(item),
        MetricsHelper.getGcpNetworkIn(item),
        MetricsHelper.getGcpNetworkOut(item),
        undefined,
        Label.createInstances(item.labels),
        this.project
      ))
      return new Response<Type>(items)
    }

    private async generateDisksResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const items = responseJson.map((item: any) => new Disks(
        item.name,
        StringHelper.splitAndGetAtIndex(item.zone, '/', -1) || '',
        StringHelper.splitAndGetAtIndex(item.type, '/', -1),
        item.users?.length > 0,
        item.status,
        (parseFloat(item.sizeGb) | 0) * 1073741824,
        item.creationTimestamp,
        Label.createInstances(item.labels),
        this.project
      ))
      return new Response<Type>(items)
    }

    private async generateSqlResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const items = responseJson.map((item: any) => new Sql(
        item.name,
        item.region,
        item.databaseVersion,
        'secondaryGceZone' in item,
        MetricsHelper.getGcpDatabaseConnections(item),
        Label.createInstances(item.settings?.userLabels),
        this.project
      ))
      return new Response<Type>(items)
    }

    private async generateLbResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const items = responseJson.map((item: any) => new Lb(
        item.name,
        StringHelper.splitAndGetAtIndex(item.region, '/', -1) || '',
        item.IPProtocol,
        !('region' in item),
        item.creationTimestamp,
        Label.createInstances(item.labels),
        this.project
      ))
      return new Response<Type>(items)
    }

    private async generateEipResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const items = responseJson.map((item: any) => new Eip(
        item.address,
        StringHelper.splitAndGetAtIndex(item.region, '/', -1) || '',
        item.name,
        Label.createInstances(item.labels),
        this.project
      ))
      return new Response<Type>(items)
    }

    private getPolicy (policyName: string) {
      // @ts-ignore
      return JSON.parse(JSON.stringify(Object.assign({}, policies[policyName])))
    }
}
