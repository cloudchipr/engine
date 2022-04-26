import { GcpClientInterface } from './gcp-client-interface'
import { AddressesClient, GlobalAddressesClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Eip } from '../../../domain/types/gcp/eip'
import { Label } from '../../../domain/types/gcp/shared/label'
import GcpBaseClient from './gcp-base-client'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import {
  CleanGcpLbEipMetadataInterface
} from '../../../request/clean/clean-request-resource-metadata-interface'
import { GcpPriceCalculator } from '../gcp-price-calculator'

export default class GcpEipClient extends GcpBaseClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpEipClient.getAddressesClient().list({ project: process.env.GOOGLE_CLOUD_PROJECT ?? 'cloud-test-340820', region }))
    }
    promises.push(GcpEipClient.getGlobalAddressesClient().list({ project: process.env.GOOGLE_CLOUD_PROJECT ?? 'cloud-test-340820' }))
    return promises
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return GcpEipClient.getGlobalAddressesClient().delete({ address: request.id, project: process.env.GOOGLE_CLOUD_PROJECT ?? 'cloud-test-340820' })
    } else {
      return GcpEipClient.getAddressesClient().delete({ address: request.id, region: metadata.region, project: process.env.GOOGLE_CLOUD_PROJECT ?? 'cloud-test-340820' })
    }
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    return metadata.global || !!metadata.region
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Eip(
            instance.address,
            StringHelper.splitAndGetAtIndex(instance.region, '/', -1) || '',
            instance.name,
            instance.addressType?.toLowerCase() || '',
            instance.creationTimestamp,
            Label.createInstances(instance.labels)
          ))
        })
      })
    })
    const result = new Response<Type>(data)
    if (result.count > 0) {
      try {
        await GcpPriceCalculator.putEipPrices(data)
      } catch (e) { result.addError(e) }
    }
    return result
  }

  private static getAddressesClient (): AddressesClient {
    return new AddressesClient()
  }

  private static getGlobalAddressesClient (): GlobalAddressesClient {
    return new GlobalAddressesClient()
  }
}
