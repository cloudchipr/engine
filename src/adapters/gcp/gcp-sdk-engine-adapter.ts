import GcpClient from './clients/gcp-client'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { CleanRequestInterface } from '../../request/clean/clean-request-interface'
import { CleanResponse } from '../../responses/clean-response'

export class GcpSdkEngineAdapter<Type> implements EngineInterface<Type> {
  async execute (request: EngineRequest): Promise<Response<Type>> {
    const gcpClient = new GcpClient(request.subCommand.getValue())
    return gcpClient.collectResources<Type>(request)
  }

  clean (request: CleanRequestInterface): Promise<CleanResponse> {
    const gcpClient = new GcpClient(request.subCommand.getValue())
    return gcpClient.cleanResources(request)
  }
}
