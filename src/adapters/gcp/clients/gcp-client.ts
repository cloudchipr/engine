import { Response } from '../../../responses/response'
import { EngineRequest } from '../../../engine-request'
import { GcpClientInterface } from './gcp-client-interface'
import { GcpSubCommand } from '../gcp-sub-command'
import GcpDisksClient from './gcp-disks-client'
import { CleanRequestInterface } from '../../../request/clean/clean-request-interface'
import { CleanResponse } from '../../../responses/clean-response'
import { CleanFailureResponse } from '../../../responses/clean-failure-response'
import { CredentialBody } from 'google-auth-library'

export default class GcpClient {
  protected readonly credentials: CredentialBody
  protected readonly projectId: string

  constructor (gcpCredentials: CredentialBody, projectId: string) {
    this.credentials = gcpCredentials
    this.projectId = projectId
  }

  async collectResources<Type> (): Promise<Response<Type>[]> {
    return []
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
          ? response.addSuccess(ids[i])
          : response.addFailure(new CleanFailureResponse(ids[i], result[i].reason.errors[0].message))
      }
    }
    return response
  }

  private static getAwsClient (subcommand: string, gcpCredentials: CredentialBody, projectId: string): GcpClientInterface {
    switch (subcommand) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return new GcpVmClient(gcpCredentials, projectId)
      case GcpSubCommand.LB_SUBCOMMAND:
        return new GcpLbClient(gcpCredentials, projectId)
      case GcpSubCommand.DISKS_SUBCOMMAND:
        return new GcpDisksClient(gcpCredentials, projectId)
      case GcpSubCommand.EIP_SUBCOMMAND:
        return new GcpEipClient(gcpCredentials, projectId)
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
