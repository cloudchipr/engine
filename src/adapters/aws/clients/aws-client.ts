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
import { Command } from '../../../command'
import { Parameter } from '../../../parameter'
import { FilterList } from '../../../filters/filter-list'

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
    const regions: string[] = []
    for (const resource of request.resources) {
      regions.push(resource.region)
    }
    const engineRequest = new EngineRequest(Command.collect(), request.subCommand, new Parameter(new FilterList(), false, regions, []), false)
    const collectResources = await this.collectResources(engineRequest, false)

    const promises: any[] = []
    for (const resource of request.resources) {
      if (this.awsClientInstance.isCleanRequestValid(resource)) {
        promises.push(this.awsClientInstance.getCleanCommands(resource))
      } else {
        response.addFailure(new CleanFailureResponse(resource.id, 'Invalid data provided'))
      }
    }

    // @ts-ignore
    const result: {status: string, value: string, reason: string}[] = await Promise.allSettled(promises)
    let savings = 0
    for (let i = 0; i < result.length; i++) {
      if (result[i].status === 'fulfilled') {
        response.addSuccess(result[i].value)
        // @ts-ignore
        const price = collectResources.items.filter((item) => item.getId() === result[i].value)[0]?.pricePerMonth
        savings += (price || 0)
      } else {
        response.addFailure(new CleanFailureResponse(request.resources[i].id, result[i].reason))
      }
    }
    response.savedCosts = savings
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
