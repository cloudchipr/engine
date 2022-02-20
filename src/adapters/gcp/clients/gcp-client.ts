import { Response } from '../../../responses/response'
import { EngineRequest } from '../../../engine-request'
import { GcpClientInterface } from './gcp-client-interface'
import GcpVmClient from './gcp-vm-client'
import { GcpSubCommand } from '../gcp-sub-command'

export default class GcpClient {
  private gcpClientInterface: GcpClientInterface;

  constructor (subcommand: string) {
    this.gcpClientInterface = GcpClient.getAwsClient(subcommand)
  }

  async collectResources<Type> (request: EngineRequest): Promise<Response<Type>> {
    let promises: any[] = []
    for (const region of request.parameter.regions) {
      promises = [...promises, ...this.gcpClientInterface.getCollectCommands(region)]
    }
    const response = await Promise.all(promises)
    return await this.gcpClientInterface.formatCollectResponse<Type>(response)
  }

  private static getAwsClient (subcommand: string): GcpClientInterface {
    switch (subcommand) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return new GcpVmClient()
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
