import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { CleanRequestInterface } from '../../request/clean/clean-request-interface'
import { CleanResponse } from '../../responses/clean-response'
import { CredentialBody } from 'google-auth-library'
import { GcpClient } from './clients/gcp-client'

export class GcpSdkEngineAdapter<Type> implements EngineInterface<Type> {
  private readonly credentials: CredentialBody

  constructor (gcpCredentials: CredentialBody) {
    this.credentials = gcpCredentials
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute (request: EngineRequest): Promise<Response<Type>> {
    return new Response<Type>([])
  }

  async collectAll (projectId: string): Promise<Response<Type>[]> {
    const gcpClient = new GcpClient(this.credentials, projectId)
    return gcpClient.collectResources()
  }

  clean (request: CleanRequestInterface, projectId: string): Promise<CleanResponse> {
    const gcpClient = new GcpClient(this.credentials, projectId)
    return gcpClient.cleanResources(request)
  }
}
