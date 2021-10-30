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
import { DateTimeHelper } from '../../helpers/date-time-helper'
import { TagsHelper } from '../../helpers/tags-helper'
import { Rds } from '../../domain/types/aws/rds'
import { MetricsHelper } from '../../helpers/metrics-helper'
import AwsPriceCalculator from './aws-price-calculator'
import { Configuration } from '../../configuration'

export class AWSShellEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly custodianExecutor: C7nExecutor;
    private readonly awsPriceCalculator: AwsPriceCalculator;

    constructor (configuration: Configuration, custodian: string) {
      this.custodianExecutor = new C7nExecutor(custodian)
      this.awsPriceCalculator = new AwsPriceCalculator(configuration)
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
      policy.policies[0].filters.push(request.parameter.filter.build(new C7nFilterBuilder(request.subCommand)))

      // execute custodian command and return response
      const response = this.custodianExecutor.execute(
        request.configuration,
        policy,
        policyName
      )
      return (this as any)[generateResponseMethodName](response)
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
                VolumeType: string;
                CreateTime: string;
                AvailabilityZone: string;
                Tags: any[];
            }) => {
          return new Ebs(
            ebsResponseItemJson.VolumeId,
            ebsResponseItemJson.Size,
            ebsResponseItemJson.VolumeType,
            ebsResponseItemJson.AvailabilityZone,
            DateTimeHelper.getAge(ebsResponseItemJson.CreateTime),
            TagsHelper.getNameTagValue(ebsResponseItemJson.Tags)
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
                Platform: string | null;
                UsageOperation: string | null,
                Placement: { Tenancy: string, AvailabilityZone: string },
            }) => {
          return new Ec2(
            ec2ResponseItemJson.InstanceId,
            ec2ResponseItemJson.ImageId,
            ec2ResponseItemJson.InstanceType,
            MetricsHelper.getCpuUtilization(ec2ResponseItemJson),
            MetricsHelper.getNetworkIn(ec2ResponseItemJson),
            MetricsHelper.getNetworkOut(ec2ResponseItemJson),
            DateTimeHelper.getAge(ec2ResponseItemJson.LaunchTime),
            ec2ResponseItemJson.Placement.Tenancy,
            ec2ResponseItemJson.Placement.AvailabilityZone,
            TagsHelper.getNameTagValue(ec2ResponseItemJson.Tags)
          )
        }
      )

      await this.awsPriceCalculator.putEc2Prices(ec2Items)
      return new Response<Type>(ec2Items)
    }

    private generateElbResponse (
      responseJson: any
    ): Response<Type> {
      return new Response<Type>(
        responseJson.sort((a: any, b: any) => (a.CreatedTime > b.CreatedTime) ? 1 : ((b.CreatedTime > a.CreatedTime) ? -1 : 0))
          .map(
            (elbResponseItemJson: {
                        DNSName: string;
                        CreatedTime: string;
                        Price: string;
                        Tags: any[];
                    }) => {
              return new Elb(
                elbResponseItemJson.DNSName,
                DateTimeHelper.getAge(elbResponseItemJson.CreatedTime),
                TagsHelper.getNameTagValue(elbResponseItemJson.Tags)
              )
            }
          )
      )
    }

    private generateNlbResponse (
      responseJson: any
    ): Response<Type> {
      return new Response<Type>(
        responseJson.sort((a: any, b: any) => (a.CreatedTime > b.CreatedTime) ? 1 : ((b.CreatedTime > a.CreatedTime) ? -1 : 0))
          .map(
            (elbResponseItemJson: {
                        DNSName: string;
                        CreatedTime: string;
                        Price: string;
                        Tags: any[];
                    }) => {
              return new Elb(
                elbResponseItemJson.DNSName,
                DateTimeHelper.getAge(elbResponseItemJson.CreatedTime),
                TagsHelper.getNameTagValue(elbResponseItemJson.Tags)
              )
            }
          )
      )
    }

    private generateAlbResponse (
      responseJson: any
    ): Response<Type> {
      return new Response<Type>(
        responseJson.sort((a: any, b: any) => (a.CreatedTime > b.CreatedTime) ? 1 : ((b.CreatedTime > a.CreatedTime) ? -1 : 0))
          .map(
            (elbResponseItemJson: {
                        DNSName: string;
                        CreatedTime: string;
                        Price: string;
                        Tags: any[];
                    }) => {
              return new Elb(
                elbResponseItemJson.DNSName,
                DateTimeHelper.getAge(elbResponseItemJson.CreatedTime),
                TagsHelper.getNameTagValue(elbResponseItemJson.Tags)
              )
            }
          )
      )
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
                }) => {
            return new Eip(
              eipResponseItemJson.PublicIp,
              eipResponseItemJson.NetworkBorderGroup,
              TagsHelper.getNameTagValue(eipResponseItemJson.Tags)
            )
          }
        )

      await this.awsPriceCalculator.putEipPrices(eipItems)
      return new Response<Type>(eipItems)
    }

    private async generateRdsResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const rdsItems = responseJson.sort((a: any, b: any) => (a.InstanceCreateTime > b.InstanceCreateTime) ? 1 : ((b.InstanceCreateTime > a.InstanceCreateTime) ? -1 : 0))
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
                }) => {
            return new Rds(
              rdsResponseItemJson.DBInstanceIdentifier,
              rdsResponseItemJson.DBInstanceClass,
              rdsResponseItemJson.StorageType,
              MetricsHelper.getDatabaseConnections(rdsResponseItemJson),
              rdsResponseItemJson.Engine,
              DateTimeHelper.getAge(rdsResponseItemJson.InstanceCreateTime),
              rdsResponseItemJson.AvailabilityZone,
              TagsHelper.getNameTagValue(rdsResponseItemJson.Tags)
            )
          }
        )

      await this.awsPriceCalculator.putRdsPrices(rdsItems)
      return new Response<Type>(rdsItems)
    }
}