import { EngineInterface } from './engine-interface'
import * as policies from '../policy.json'
import { Ebs } from '../domain/types/aws/ebs'
import { EngineRequest } from '../engine-request'
import { C7nFilterBuilder } from '../filters/c7n-filter-builder'
import { C7nExecutor } from '../c7n-executor'
import { Response } from '../responses/response'
import { Ec2 } from '../domain/types/aws/ec2'
import { Elb } from '../domain/types/aws/elb'
import { Eip } from '../domain/types/aws/eip'
import { DateTimeHelper } from '../helpers/date-time-helper'
import { TagsHelper } from '../helpers/tags-helper'
import { Rds } from '../domain/types/aws/rds'
import { MetricsHelper } from '../helpers/metrics-helper'
import { StringHelper } from '../helpers/string-hepler'

export class AWSShellEngineAdapter<Type> implements EngineInterface<Type> {
  private readonly custodianExecutor: C7nExecutor;

  constructor (custodian: string) {
    this.custodianExecutor = new C7nExecutor(custodian)
  }

  execute (request: EngineRequest): Response<Type> {
    const command = request.command.getValue()
    const subCommand = request.subCommand.getValue()

    const generateResponseMethodName = AWSShellEngineAdapter.getResponseMethodName(subCommand)
    this.validateRequest(generateResponseMethodName)

    const policyName = `${subCommand}-${command}`
    this.validatePolicyName(policyName)

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

  private validatePolicyName (policy: string) {
    if (!(policy in policies)) {
      throw new Error(`Invalid policy name provided: ${policy}`)
    }
  }

  private static getResponseMethodName (subCommand: string): string {
    return `generate${StringHelper.capitalizeFirstLetter(subCommand)}Response`
  }

  private generateEbsResponse (
    responseJson: any
  ): Response<Type> {
    return new Response<Type>(
      responseJson.map(
        (ebsResponseItemJson: {
          VolumeId: string;
          Size: number;
          VolumeType: string;
          CreateTime: string;
          Price: string;
          Tags: any[];
        }) => {
          return new Ebs(
            ebsResponseItemJson.VolumeId,
            ebsResponseItemJson.Size,
            ebsResponseItemJson.VolumeType,
            DateTimeHelper.getAge(ebsResponseItemJson.CreateTime),
            'not implemented',
            TagsHelper.getNameTagValue(ebsResponseItemJson.Tags)
          )
        }
      )
    )
  }

  private generateEc2Response (
    responseJson: any
  ): Response<Type> {
    return new Response<Type>(
      responseJson.map(
        (ec2ResponseItemJson: {
          InstanceId: string;
          InstanceType: string;
          Cpu: string;
          NetworkIn: string;
          NetworkOut: string;
          LaunchTime: string;
          Price: string;
          Tags: any[];
        }) => {
          return new Ec2(
            ec2ResponseItemJson.InstanceId,
            ec2ResponseItemJson.InstanceType,
            MetricsHelper.getCpuUtilization(ec2ResponseItemJson),
            MetricsHelper.getNetworkIn(ec2ResponseItemJson),
            MetricsHelper.getNetworkOut(ec2ResponseItemJson),
            ec2ResponseItemJson.LaunchTime,
            'not implemented',
            TagsHelper.getNameTagValue(ec2ResponseItemJson.Tags)
          )
        }
      )
    )
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
              'not implemented',
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
              'not implemented',
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
              'not implemented',
              TagsHelper.getNameTagValue(elbResponseItemJson.Tags)
            )
          }
        )
    )
  }

  private generateEipResponse (
    responseJson: any
  ): Response<Type> {
    return new Response<Type>(
      responseJson
        .map(
          (eipResponseItemJson: {
            PublicIp: string;
            Price: string;
            Tags: any[];
          }) => {
            return new Eip(
              eipResponseItemJson.PublicIp,
              'not implemented',
              TagsHelper.getNameTagValue(eipResponseItemJson.Tags)
            )
          }
        )
    )
  }

  private generateRdsResponse (
    responseJson: any
  ): Response<Type> {
    return new Response<Type>(
      responseJson.sort((a: any, b: any) => (a.InstanceCreateTime > b.InstanceCreateTime) ? 1 : ((b.InstanceCreateTime > a.InstanceCreateTime) ? -1 : 0))
        .map(
          (rdsResponseItemJson: {
            DBInstanceIdentifier: string;
            DBInstanceClass: string;
            Engine: string;
            InstanceCreateTime: string;
            'c7n.metrics': any;
            Price: string;
            Tags: any[];
          }) => {
            return new Rds(
              rdsResponseItemJson.DBInstanceIdentifier,
              rdsResponseItemJson.DBInstanceClass,
              MetricsHelper.getDatabaseConnections(rdsResponseItemJson),
              rdsResponseItemJson.Engine,
              DateTimeHelper.getAge(rdsResponseItemJson.InstanceCreateTime),
              'not-implemented',
              TagsHelper.getNameTagValue(rdsResponseItemJson.Tags)
            )
          }
        )
    )
  }
}
