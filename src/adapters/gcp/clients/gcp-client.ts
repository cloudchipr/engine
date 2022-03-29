import { Response } from '../../../responses/response'
import { EngineRequest } from '../../../engine-request'
import { GcpClientInterface } from './gcp-client-interface'
import GcpVmClient from './gcp-vm-client'
import { GcpSubCommand } from '../gcp-sub-command'
import GcpLbClient from './gcp-lb-client'
import GcpDisksClient from './gcp-disks-client'
import GcpEipClient from './gcp-eip-client'
import { CleanRequestInterface } from '../../../request/clean/clean-request-interface'
import { CleanResponse } from '../../../responses/clean-response'
import { CleanFailureResponse } from '../../../responses/clean-failure-response'
import { StringHelper } from '../../../helpers/string-hepler'

export default class GcpClient {
  private gcpClientInterface: GcpClientInterface;

  constructor (subcommand: string) {
    this.gcpClientInterface = GcpClient.getAwsClient(subcommand)
  }

  async collectResources<Type> (request: EngineRequest): Promise<Response<Type>> {
    const response = await Promise.all(this.gcpClientInterface.getCollectCommands(request.parameter.regions))
    const formattedResponse = await this.gcpClientInterface.formatCollectResponse<Type>(response)
    return await this.gcpClientInterface.getAdditionalDataForFormattedCollectResponse<Type>(formattedResponse)
  }

  async cleanResources (request: CleanRequestInterface): Promise<CleanResponse> {
    const response = new CleanResponse(request.subCommand.getValue())
    const promises: any[] = []
    const ids: string[] = []
    for (const resource of request.resources) {
      if (this.gcpClientInterface.isCleanRequestValid(resource)) {
        promises.push(this.gcpClientInterface.getCleanCommands(resource))
        ids.push(resource.id)
      } else {
        response.addFailure(new CleanFailureResponse(resource.id, 'Invalid data provided'))
      }
    }
    if (promises.length > 0) {
      const result: any = await Promise.allSettled(promises)
      for (let i = 0; i < result.length; i++) {
        result[i].status === 'fulfilled'
          ? response.addSuccess(StringHelper.splitAndGetAtIndex(result[i].value[0]?.latestResponse?.targetLink, '/', -1) || '')
          : response.addFailure(new CleanFailureResponse(ids[i], result[i].reason.errors[0].message))
      }
    }
    return response
  }

  private static getAwsClient (subcommand: string): GcpClientInterface {
    switch (subcommand) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return new GcpVmClient()
      case GcpSubCommand.LB_SUBCOMMAND:
        return new GcpLbClient()
      case GcpSubCommand.DISKS_SUBCOMMAND:
        return new GcpDisksClient()
      case GcpSubCommand.EIP_SUBCOMMAND:
        return new GcpEipClient()
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
