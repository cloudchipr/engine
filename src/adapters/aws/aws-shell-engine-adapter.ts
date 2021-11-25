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
import { Alb } from '../../domain/types/aws/alb'
import { Nlb } from '../../domain/types/aws/nlb'
import { Rds } from '../../domain/types/aws/rds'
import { TagsHelper } from '../../helpers/tags-helper'
import { MetricsHelper } from '../../helpers/metrics-helper'
import AwsPriceCalculator from './aws-price-calculator'

export class AWSShellEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly custodianExecutor: C7nExecutor;
    private readonly awsPriceCalculator: AwsPriceCalculator;

    constructor (custodian: string) {
      this.custodianExecutor = new C7nExecutor(custodian)
      this.awsPriceCalculator = new AwsPriceCalculator()
    }

    execute (request: EngineRequest): Promise<Response<Type>> {
      const command = request.command.getValue()
      const subCommand = request.subCommand.getValue()

      const generateResponseMethodName = AWSShellEngineAdapter.getResponseMethodName(subCommand)
      this.validateRequest(generateResponseMethodName)

      const policyName = `${subCommand}-${command}`
      AWSShellEngineAdapter.validatePolicyName(policyName)

      // @ts-ignore
      const policy: any = Object.assign({}, policies[policyName])
      const filters: object = request.parameter.filter?.build(new C7nFilterBuilder(request.subCommand))

      if (filters && Object.keys(filters).length) {
        if (typeof policy.policies[0].filters === 'undefined') {
          policy.policies[0].filters = []
        }
        policy.policies[0].filters.push(filters)
      }

      // execute custodian command and return response
      try {
        const response = this.custodianExecutor.execute(
          policy,
          policyName,
          request.parameter.regions
        )

        if (request.isDebugMode) {
          console.log(policyName + ' Response: ' + JSON.stringify(response))
        }

        return (this as any)[generateResponseMethodName](response)
      } catch {
        throw new Error('Failed to execute custodian command')
      } finally {
        if (request.isDebugMode) {
          console.log(policyName + ' Policy: ' + JSON.stringify(policy))
        }
      }
    }

    private validateRequest (name: string) {
      if (typeof (this as any)[name] !== 'function') {
        throw Error('Invalid AWS subcommand provided: ' + name)
      }
    }

    private static validatePolicyName (policy: string) {
      if (!(policy in policies)) {
        throw new Error(`Invalid policy name provided: ${policy}`)
      }
    }

    private static getResponseMethodName (subCommand: string): string {
      return `generate${AWSShellEngineAdapter.capitalizeFirstLetter(subCommand)}Response`
    }

    private static capitalizeFirstLetter (str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1)
    }

    private async generateEbsResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const ebsItems = responseJson.map(
        (ebsResponseItemJson: {
                VolumeId: string;
                Size: number;
                State: string;
                VolumeType: string;
                CreateTime: string;
                AvailabilityZone: string;
                Tags: any[];
                C8rRegion: string|undefined;
            }) => {
          return new Ebs(
            ebsResponseItemJson.VolumeId,
            ebsResponseItemJson.Size,
            ebsResponseItemJson.State,
            ebsResponseItemJson.VolumeType,
            ebsResponseItemJson.AvailabilityZone,
            ebsResponseItemJson.CreateTime,
            TagsHelper.getNameTagValue(ebsResponseItemJson.Tags),
            ebsResponseItemJson.C8rRegion
          )
        }
      )

      await this.awsPriceCalculator.putEbsPrices(ebsItems)
      return new Response<Type>(ebsItems)
    }

    private async generateEc2Response (
      responseJson: any
    ): Promise<Response<Type>> {
      const ec2Items = responseJson.map(
        (ec2ResponseItemJson: {
                InstanceId: string;
                ImageId: string;
                InstanceType: string;
                Cpu: string;
                NetworkIn: string;
                NetworkOut: string;
                LaunchTime: string;
                Tags: any[];
                Placement: { Tenancy: string, AvailabilityZone: string };
                C8rRegion: string|undefined
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
            TagsHelper.getNameTagValue(ec2ResponseItemJson.Tags),
            ec2ResponseItemJson.C8rRegion
          )
        }
      )

      await this.awsPriceCalculator.putEc2Prices(ec2Items)
      return new Response<Type>(ec2Items)
    }

    private async generateElbResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const elbItems = responseJson
        .map(
          (elbResponseItemJson: {
                    LoadBalancerName: string;
                    DNSName: string;
                    CreatedTime: string;
                    Tags: any[];
                    C8rRegion: string|undefined
                }) => {
            return new Elb(
              elbResponseItemJson.LoadBalancerName,
              elbResponseItemJson.DNSName,
              elbResponseItemJson.CreatedTime,
              TagsHelper.getNameTagValue(elbResponseItemJson.Tags),
              elbResponseItemJson.C8rRegion
            )
          }
        )

      await this.awsPriceCalculator.putElbPrices(elbItems)
      return new Response<Type>(elbItems)
    }

    private async generateNlbResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const nlbItems = responseJson
        .map(
          (elbResponseItemJson: {
                    LoadBalancerName: string;
                    DNSName: string;
                    CreatedTime: string;
                    Tags: any[];
                    C8rRegion: string|undefined
                }) => {
            return new Nlb(
              elbResponseItemJson.LoadBalancerName,
              elbResponseItemJson.DNSName,
              elbResponseItemJson.CreatedTime,
              TagsHelper.getNameTagValue(elbResponseItemJson.Tags),
              elbResponseItemJson.C8rRegion
            )
          }
        )

      await this.awsPriceCalculator.putElbPrices(nlbItems)
      return new Response<Type>(nlbItems)
    }

    private async generateAlbResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const albItems = responseJson
        .map(
          (elbResponseItemJson: {
                    LoadBalancerName: string;
                    DNSName: string;
                    CreatedTime: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                }) => {
            return new Alb(
              elbResponseItemJson.LoadBalancerName,
              elbResponseItemJson.DNSName,
              elbResponseItemJson.CreatedTime,
              TagsHelper.getNameTagValue(elbResponseItemJson.Tags),
              elbResponseItemJson.C8rRegion
            )
          }
        )

      await this.awsPriceCalculator.putElbPrices(albItems)
      return new Response<Type>(albItems)
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
                }) => {
            return new Eip(
              eipResponseItemJson.PublicIp,
              eipResponseItemJson.NetworkBorderGroup,
              TagsHelper.getNameTagValue(eipResponseItemJson.Tags),
              eipResponseItemJson.C8rRegion
            )
          }
        )

      await this.awsPriceCalculator.putEipPrices(eipItems)
      return new Response<Type>(eipItems)
    }

    private async generateRdsResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const rdsItems = responseJson
        .map(
          (rdsResponseItemJson: {
                    DBInstanceIdentifier: string;
                    DBInstanceClass: string;
                    StorageType: string;
                    Engine: string;
                    InstanceCreateTime: string;
                    'c7n.metrics': any;
                    AvailabilityZone: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                }) => {
            return new Rds(
              rdsResponseItemJson.DBInstanceIdentifier,
              rdsResponseItemJson.DBInstanceClass,
              rdsResponseItemJson.StorageType,
              MetricsHelper.getDatabaseConnections(rdsResponseItemJson),
              rdsResponseItemJson.Engine,
              rdsResponseItemJson.InstanceCreateTime,
              rdsResponseItemJson.AvailabilityZone,
              TagsHelper.getNameTagValue(rdsResponseItemJson.Tags),
              rdsResponseItemJson.C8rRegion
            )
          }
        )

      await this.awsPriceCalculator.putRdsPrices(rdsItems)
      return new Response<Type>(rdsItems)
    }
}
