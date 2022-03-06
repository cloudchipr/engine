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

    private async generateDisksResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const ec2Items = responseJson.map(
        (ec2ResponseItemJson: {
                InstanceId: string;
                ImageId: string;
                InstanceType: string;
                SpotInstanceRequestId: string|undefined;
                PlatformDetails: string;
                UsageOperation: string
                Cpu: string;
                NetworkIn: string;
                NetworkOut: string;
                LaunchTime: string;
                Tags: any[];
                Placement: { Tenancy: string, AvailabilityZone: string };
                C8rRegion: string|undefined;
                C8rAccount: string|undefined;
            }) => {
          return new Ec2(
            ec2ResponseItemJson.InstanceId,
            ec2ResponseItemJson.ImageId,
            ec2ResponseItemJson.InstanceType,
            MetricsHelper.getCpuUtilization(ec2ResponseItemJson),
            MetricsHelper.getNetworkIn(ec2ResponseItemJson),
            MetricsHelper.getNetworkOut(ec2ResponseItemJson),
            ec2ResponseItemJson.LaunchTime,
            ec2ResponseItemJson.Placement.Tenancy,
            ec2ResponseItemJson.Placement.AvailabilityZone,
            ec2ResponseItemJson.SpotInstanceRequestId !== undefined,
            ec2ResponseItemJson.PlatformDetails,
            ec2ResponseItemJson.UsageOperation,
            undefined,
            TagsHelper.getNameTagValue(ec2ResponseItemJson.Tags),
            [],
            ec2ResponseItemJson.C8rRegion,
            ec2ResponseItemJson.C8rAccount
          )
        }
      )

      //await this.awsPriceCalculator.putEc2Prices(ec2Items)
      return new Response<Type>(ec2Items)
    }

    private async generateLbResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const elbItems = responseJson
        .map(
          (elbResponseItemJson: {
                    LoadBalancerName: string;
                    DNSName: string;
                    CreatedTime: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                    C8rAccount: string|undefined;
                }) => {
            return new Elb(
              elbResponseItemJson.LoadBalancerName,
              elbResponseItemJson.DNSName,
              undefined,
              elbResponseItemJson.CreatedTime,
              'classic',
              false,
              TagsHelper.getNameTagValue(elbResponseItemJson.Tags),
              [],
              elbResponseItemJson.C8rRegion,
              elbResponseItemJson.C8rAccount
            )
          }
        )

      //await this.awsPriceCalculator.putElbPrices(elbItems)
      return new Response<Type>(elbItems)
    }

    private async generateEipResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const eipItems = responseJson
        .map(
          (eipResponseItemJson: {
                    PublicIp: string;
                    Price: string;
                    NetworkBorderGroup: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                    C8rAccount: string|undefined;
                }) => {
            return new Eip(
              eipResponseItemJson.PublicIp,
              eipResponseItemJson.NetworkBorderGroup,
              TagsHelper.getNameTagValue(eipResponseItemJson.Tags),
              undefined,
              undefined,
              undefined,
              undefined,
              [],
              eipResponseItemJson.C8rRegion,
              eipResponseItemJson.C8rAccount
            )
          }
        )

      //await this.awsPriceCalculator.putEipPrices(eipItems)
      return new Response<Type>(eipItems)
    }

    private async generateSqlResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const rdsItems = responseJson
        .map(
          (rdsResponseItemJson: {
                    DBInstanceIdentifier: string;
                    DBInstanceClass: string;
                    StorageType: string;
                    Engine: string;
                    MultiAZ: boolean;
                    InstanceCreateTime: string;
                    'c7n.metrics': any;
                    AvailabilityZone: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                    C8rAccount: string|undefined;
                }) => {
            return new Rds(
              rdsResponseItemJson.DBInstanceIdentifier,
              rdsResponseItemJson.DBInstanceClass,
              rdsResponseItemJson.StorageType,
              MetricsHelper.getDatabaseConnections(rdsResponseItemJson),
              MetricsHelper.getDatabaseIOPS(rdsResponseItemJson),
              rdsResponseItemJson.Engine,
              rdsResponseItemJson.MultiAZ,
              rdsResponseItemJson.InstanceCreateTime,
              rdsResponseItemJson.AvailabilityZone,
              undefined,
              TagsHelper.getNameTagValue(rdsResponseItemJson.Tags),
              [],
              rdsResponseItemJson.C8rRegion,
              rdsResponseItemJson.C8rAccount
            )
          }
        )

      //await this.awsPriceCalculator.putRdsPrices(rdsItems)
      return new Response<Type>(rdsItems)
    }

    private getPolicy (policyName: string) {
      // @ts-ignore
      return JSON.parse(JSON.stringify(Object.assign({}, policies[policyName])))
    }
}
