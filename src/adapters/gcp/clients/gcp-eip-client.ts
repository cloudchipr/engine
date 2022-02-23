import { GcpClientInterface } from './gcp-client-interface'
import { AddressesClient, GlobalAddressesClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Eip } from '../../../domain/types/gcp/eip'

export default class GcpEipClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpEipClient.getAddressesClient().list({ project: 'cloud-test-340820', region }))
    }
    promises.push(GcpEipClient.getGlobalAddressesClient().list({ project: 'cloud-test-340820' }))
    return promises
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Eip(
            instance.address,
            instance.name,
            StringHelper.splitAndGetAtIndex(instance.region, '/', -1)
          ))
        })
      })
    })
    return new Response<Type>(data)
  }

  private static getAddressesClient (): AddressesClient {
    return new AddressesClient()
  }

  private static getGlobalAddressesClient (): GlobalAddressesClient {
    return new GlobalAddressesClient()
  }
}
