import GcpClient from './clients/gcp-client'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { CleanRequestInterface } from '../../request/clean/clean-request-interface'
import { CleanResponse } from '../../responses/clean-response'
import { CredentialBody } from 'google-auth-library'

export class GcpSdkEngineAdapter<Type> implements EngineInterface<Type> {
  private readonly credentials: CredentialBody

  constructor (gcpCredentials: CredentialBody) {
    this.credentials = gcpCredentials
  }

  async execute (request: EngineRequest): Promise<Response<Type>> {
    const gcpClient = new GcpClient(request.subCommand.getValue(), this.credentials, request.parameter.accounts[0])
    return gcpClient.collectResources<Type>(request)
  }

  clean (request: CleanRequestInterface, projectId: string): Promise<CleanResponse> {
    const gcpClient = new GcpClient(request.subCommand.getValue(), this.credentials, projectId)
    return gcpClient.cleanResources(request)
  }
}
