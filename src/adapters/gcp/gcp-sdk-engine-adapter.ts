import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { CleanRequestInterface } from '../../request/clean/clean-request-interface'
import { CleanResponse } from '../../responses/clean-response'
import { GcpClient } from './clients/gcp-client'
import { CachingInterface } from '../caching-interface'
import { PricingInterface } from '../pricing-interface'
import { BaseExternalAccountClient } from 'google-auth-library'

export class GcpSdkEngineAdapter<Type> implements EngineInterface<Type> {
  private readonly authClient: BaseExternalAccountClient

  constructor (authClient: BaseExternalAccountClient) {
    this.authClient = authClient
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute (request: EngineRequest): Promise<Response<Type>> {
    return new Response<Type>([])
  }

  async collectAll (
    projectId: string,
    pricingFallbackInterface?: PricingInterface,
    pricingCachingInterface?: CachingInterface
  ): Promise<Response<Type>[]> {
    const gcpClient = new GcpClient(this.authClient, projectId)
    return gcpClient.collectResources(pricingFallbackInterface, pricingCachingInterface)
  }

  clean (request: CleanRequestInterface, projectId: string): Promise<CleanResponse> {
    const gcpClient = new GcpClient(this.authClient, projectId)
    return gcpClient.cleanResources(request)
  }
}
