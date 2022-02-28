import { Response } from '../../../responses/response'
import { EngineRequest } from '../../../engine-request'
import { GcpClientInterface } from './gcp-client-interface'
import GcpVmClient from './gcp-vm-client'
import { GcpSubCommand } from '../gcp-sub-command'
import GcpLbClient from './gcp-lb-client'
import GcpDisksClient from './gcp-disks-client'
import GcpEipClient from './gcp-eip-client'

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