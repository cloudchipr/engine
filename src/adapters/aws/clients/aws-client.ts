import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'
import { AwsClientInterface } from './aws-client-interface'
import AwsEbsClient from './aws-ebs-client'
import AwsEc2Client from './aws-ec2-client'
import AwsEipClient from './aws-eip-client'
import AwsElbClient from './aws-elb-client'
import AwsRdsClient from './aws-rds-client'
import { AwsSubCommand } from '../../../aws-sub-command'
import { CleanResponse } from '../../../responses/clean-response'
import { CleanFailureResponse } from '../../../responses/clean-failure-response'
import { EngineRequest } from '../../../engine-request'
import { CleanRequestInterface } from '../../../request/clean/clean-request-interface'
import { Code } from '../../../responses/code'

export default class AwsClient {
  private awsClientInstance: AwsClientInterface;

  constructor (subcommand: string, credentialProvider: CredentialProvider) {
    this.awsClientInstance = AwsClient.getAwsClient(subcommand, credentialProvider)
  }

  async collectResources<Type> (request: EngineRequest, withAdditionalData: boolean = true): Promise<Response<Type>> {
    let promises: any[] = []
    for (const region of request.parameter.regions) {
      promises = [...promises, ...this.awsClientInstance.getCollectCommands(region)]
    }
    const response = await Promise.all(promises)
    if (withAdditionalData) {
      const formattedResponse = await this.awsClientInstance.formatCollectResponse<Type>(response)
      return this.awsClientInstance.getAdditionalDataForFormattedCollectResponse<Type>(formattedResponse)
    } else {
      return this.awsClientInstance.formatCollectResponse<Type>(response)
    }
  }

  async cleanResources (request: CleanRequestInterface): Promise<CleanResponse> {
    const response = new CleanResponse(request.subCommand.getValue())
    let hasRateLimitError: boolean = false
    let start = 0
    while (true) {
      const promises: any[] = []
      const resources = request.resources.slice(start, start + this.awsClientInstance.getRateLimit())
      start += this.awsClientInstance.getRateLimit()
      if (resources.length === 0) {
        break
      }
      for (const resource of resources) {
        if (this.awsClientInstance.isCleanRequestValid(resource)) {
          promises.push(this.awsClientInstance.getCleanCommands(resource))
        } else {
          response.addFailure(new CleanFailureResponse(resource.id, 'Invalid data provided', 'InvalidData'))
        }
      }
      // @ts-ignore
      const result: {status: string, value: string, reason: {id: string, message: string, code: string}}[] = await Promise.allSettled(promises)
      for (let i = 0; i < result.length; i++) {
        if (result[i].status === 'fulfilled') {
          response.addSuccess(result[i].value)
        } else {
          hasRateLimitError = hasRateLimitError || result[i].reason.code === 'RequestLimitExceeded'
          const code = result[i].reason.code === 'RequestLimitExceeded' ? Code.LIMIT_EXCEEDED : Code.UNKNOWN
          response.addFailure(new CleanFailureResponse(result[i].reason.id, result[i].reason.message, code))
        }
      }
      if (hasRateLimitError) {
        break
      }
    }
    if (hasRateLimitError) {
      for (let i = start; i < request.resources.length; i++) {
        response.addFailure(new CleanFailureResponse(request.resources[i].id, 'Request limit exceeded.', Code.LIMIT_EXCEEDED))
      }
    }
    return response
  }

  private static getAwsClient (subcommand: string, credentialProvider: CredentialProvider): AwsClientInterface {
    switch (subcommand) {
      case AwsSubCommand.EC2_SUBCOMMAND:
        return new AwsEc2Client(credentialProvider)
      case AwsSubCommand.EBS_SUBCOMMAND:
        return new AwsEbsClient(credentialProvider)
      case AwsSubCommand.ELB_SUBCOMMAND:
        return new AwsElbClient(credentialProvider)
      case AwsSubCommand.EIP_SUBCOMMAND:
        return new AwsEipClient(credentialProvider)
      case AwsSubCommand.RDS_SUBCOMMAND:
        return new AwsRdsClient(credentialProvider)
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
