import { EngineInterface } from './engine-interface'
import * as policies from '../policy.json'
import { Ebs } from '../domain/types/aws/ebs'
import { EngineResponse } from '../engine-response'
import { EngineRequest } from '../engine-request'
import { C7nFilterBuilder } from '../filters/c7n-filter-builder'
import { C7nExecutor } from '../c7n-executor'
import { Response } from '../responses/response'
import { Ec2 } from '../domain/types/aws/ec2'

export class AWSShellEngineAdapter<Type> implements EngineInterface<Type> {
  private readonly custodianExecutor: C7nExecutor;

  constructor (custodian: string) {
    this.custodianExecutor = new C7nExecutor(custodian)
  }

  execute (request: EngineRequest): Response<Type> {
    const command = request.command.getValue()
    const subCommand = request.subCommand.getValue()

    const methodName = AWSShellEngineAdapter.getMethodName(command, subCommand)
    this.validateRequest(methodName)

    return (this as any)[methodName](request)
  }

  private collectEbs (request: EngineRequest): EngineResponse {
    const policyName = 'ebs-collect'
    const policy: any = Object.assign({}, policies[policyName])

    policy.policies[0].filters = [
      request.parameter.filter.build(new C7nFilterBuilder())
    ]

    // execute custodian command
    const responseJson = this.custodianExecutor.execute(
      request.configuration,
      policy,
      policyName
    )

    return this.generateEbsResponse(responseJson)
  }

  private cleanEbs (request: EngineRequest): EngineResponse {
    const policyName = 'ebs-clean'
    const policy: any = Object.assign({}, policies[policyName])

    policy.policies[0].filters = [
      request.parameter.filter.build(new C7nFilterBuilder())
    ]

    // execute custodian command
    const responseJson = this.custodianExecutor.execute(
      request.configuration,
      policy,
      policyName
    )

    return this.generateEbsResponse(responseJson)
  }

  private collectEc2 (request: EngineRequest): EngineResponse {
    const policyName = 'ec2-collect'
    const policy: any = Object.assign({}, policies[policyName])

    policy.policies[0].filters.push(request.parameter.filter.build(new C7nFilterBuilder()))

    // execute custodian command
    const responseJson = this.custodianExecutor.execute(
      request.configuration,
      policy,
      policyName
    )

    return this.generateEc2Response(responseJson)
  }

  private cleanEc2 (request: EngineRequest): EngineResponse {
    const policyName = 'ec2-clean'
    const policy: any = Object.assign({}, policies[policyName])

    policy.policies[0].filters.push(request.parameter.filter.build(new C7nFilterBuilder()))

    // execute custodian command
    const responseJson = this.custodianExecutor.execute(
      request.configuration,
      policy,
      policyName
    )

    return this.generateEc2Response(responseJson)
  }

  private validateRequest (name: string) {
    if (typeof (this as any)[name] !== 'function') {
      throw Error('Invalid AWS subcommand provided: ' + name)
    }
  }

  private static getMethodName (command: string, subCommand: string): string {
    return command + AWSShellEngineAdapter.capitalizeFirstLetter(subCommand)
  }

  private static capitalizeFirstLetter (str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
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
            ebsResponseItemJson.CreateTime,
            'not implemented',
            ebsResponseItemJson.Tags?.find(tagObject => ['NAME', 'Name', 'name'].includes(tagObject.Key))?.Value
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
            ec2ResponseItemJson.Cpu ?? 'not implemented',
            ec2ResponseItemJson.NetworkIn ?? 'not implemented',
            ec2ResponseItemJson.NetworkOut ?? 'not implemented',
            ec2ResponseItemJson.LaunchTime,
            'not implemented',
            ec2ResponseItemJson.Tags?.find(tagObject => ['NAME', 'Name', 'name'].includes(tagObject.Key))?.Value ?? ''
          )
        }
      )
    )
  }
}
