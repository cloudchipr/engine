import { GcpClient as OldGcpClient } from './clients/old/gcp-client'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { CleanRequestInterface } from '../../request/clean/clean-request-interface'
import { CleanResponse } from '../../responses/clean-response'
import { CredentialBody } from 'google-auth-library'
import { DisksClient } from '@google-cloud/compute'
import GcpDisksClient from './clients/gcp-disks-client'
import GcpVmClient from './clients/gcp-vm-client'
import { GcpClientInterface } from './clients/gcp-client-interface'
import { GcpSubCommand } from './gcp-sub-command'
import GcpLbClient from './clients/gcp-lb-client'
import GcpEipClient from './clients/gcp-eip-client'

export class GcpSdkEngineAdapter<Type> implements EngineInterface<Type> {
  private readonly credentials: CredentialBody

  constructor (gcpCredentials: CredentialBody) {
    this.credentials = gcpCredentials
  }

  async execute (request: EngineRequest): Promise<Response<Type>> {
    const gcpClient = new OldGcpClient(request.subCommand.getValue(), this.credentials, request.parameter.accounts[0])
    return gcpClient.collectResources<Type>(request)
  }

  clean (request: CleanRequestInterface, projectId: string): Promise<CleanResponse> {
    const gcpClient = new OldGcpClient(request.subCommand.getValue(), this.credentials, projectId)
    return gcpClient.cleanResources(request)
  }

  async collectAll (projectId: string): Promise<Response<Type>[]> {
    const promises: any[] = []
    for (const subcommand of GcpSubCommand.all()) {
      promises.push(this.getGcpClient(subcommand.getValue(), projectId).collect())
    }
    const responses = await Promise.all(promises)
    console.log(JSON.stringify(responses))
    return []
  }

  private getGcpClient (subcommand: string, projectId: string): GcpClientInterface {
    switch (subcommand) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return new GcpVmClient(this.credentials, projectId)
      case GcpSubCommand.LB_SUBCOMMAND:
        return new GcpLbClient(this.credentials, projectId)
      case GcpSubCommand.DISKS_SUBCOMMAND:
        return new GcpDisksClient(this.credentials, projectId)
      case GcpSubCommand.EIP_SUBCOMMAND:
        return new GcpEipClient(this.credentials, projectId)
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
