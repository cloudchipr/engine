import GcpClient from './clients/gcp-client'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'

export class GcpSdkEngineAdapter<Type> implements EngineInterface<Type> {
  async execute (request: EngineRequest): Promise<Response<Type>> {
    const gcpClient = new GcpClient(request.subCommand.getValue())
    return gcpClient.collectResources<Type>(request)
  }
}
