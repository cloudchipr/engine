import { GcpClientInterface } from './gcp-client-interface'
import { AddressesClient, GlobalAddressesClient } from '@google-cloud/compute'
import { Response } from '../../../../responses/response'
import { StringHelper } from '../../../../helpers/string-hepler'
import { Eip } from '../../../../domain/types/gcp/eip'
import { Label } from '../../../../domain/types/gcp/shared/label'
import GcpBaseClient from './gcp-base-client'
import { CleanRequestResourceInterface } from '../../../../request/clean/clean-request-resource-interface'
import {
  CleanGcpLbEipMetadataInterface
} from '../../../../request/clean/clean-request-resource-metadata-interface'
import { GcpPriceCalculator } from '../../gcp-price-calculator'

export default class GcpEipClient extends GcpBaseClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(this.getAddressesClient().list({ project: this.projectId, region }))
    }
    promises.push(this.getGlobalAddressesClient().list({ project: this.projectId }))
    return promises
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return this.getGlobalAddressesClient().delete({ address: request.id, project: this.projectId })
    } else {
      return this.getAddressesClient().delete({ address: request.id, region: metadata.region, project: this.projectId })
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
        await GcpPriceCalculator.putEipPrices(data, this.credentials)
      } catch (e) { result.addError(e) }
    }
    return result
  }

  private getAddressesClient (): AddressesClient {
    return new AddressesClient({ credentials: this.credentials })
  }

  private getGlobalAddressesClient (): GlobalAddressesClient {
    return new GlobalAddressesClient({ credentials: this.credentials })
  }
}
