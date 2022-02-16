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

export default class AwsClient {
  private awsClientInstance: AwsClientInterface;

  constructor (subcommand: string, credentialProvider: CredentialProvider) {
    this.awsClientInstance = AwsClient.getAwsClient(subcommand, credentialProvider)
  }

  async collectResources<Type> (request: EngineRequest): Promise<Response<Type>> {
    let promises: any[] = []
    for (const region of request.parameter.regions) {
      promises = [...promises, ...this.awsClientInstance.getCollectCommands(region)]
    }
    const response = await Promise.all(promises)
    const formattedResponse = await this.awsClientInstance.formatCollectResponse<Type>(response)
    return this.awsClientInstance.getAdditionalDataForFormattedCollectResponse<Type>(formattedResponse)
  }

  async cleanResources (request: CleanRequestInterface): Promise<CleanResponse> {
    const response = new CleanResponse(request.subCommand.getValue())
    const promises: any[] = []
    for (const resource of request.resources) {
      if (this.awsClientInstance.isCleanRequestValid(resource)) {
        promises.push(this.awsClientInstance.getCleanCommands(resource))
      } else {
        response.addFailure(new CleanFailureResponse(resource.id, 'Invalid data provided'))
      }
    }
    if (promises.length > 0) {
      const result = await Promise.allSettled(promises)
      for (let i = 0; i < result.length; i++) {
        // @ts-ignore
        result[i].status === 'fulfilled' ? response.addSuccess(result[i].value) : response.addFailure(new CleanFailureResponse(request.resources[i].id, result[i].reason))
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
