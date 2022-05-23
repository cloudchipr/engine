import {
  AddressesClient,
  GlobalAddressesClient
} from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CredentialBody } from 'google-auth-library'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpLbEipMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { Eip } from '../../../domain/types/gcp/eip'
import { google } from 'googleapis'

export class GcpEipClient {
  static async collectAll<Type> (auth: any, project: string): Promise<Response<Type>> {
    const data: any[] = []
    const result: any = await google.compute('v1').addresses.aggregatedList({ auth, project })
    Object.keys(result.data.items).forEach(key => {
      if ('addresses' in result.data.items[key] && Array.isArray(result.data.items[key].addresses)) {
        result.data.items[key].addresses?.forEach((v: any) => {
          data.push(new Eip(
            v.address,
            StringHelper.splitAndGetAtIndex(v.region, '/', -1) || '',
            v.name,
            v.addressType?.toLowerCase() || '',
            v.creationTimestamp,
            Label.createInstances(v.labels)
          ))
        })
      }
    })
    return new Response<Type>(data)
  }

  static getCleanCommands (credentials: CredentialBody, project: string, request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return GcpEipClient.getGlobalClient(credentials).delete({ address: request.id, project })
    } else {
      return GcpEipClient.getClient(credentials).delete({ address: request.id, region: metadata.region, project })
    }
  }

  static isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    return metadata.global || !!metadata.region
  }

  private static getClient (credentials: CredentialBody): AddressesClient {
    return new AddressesClient({ credentials })
  }

  private static getGlobalClient (credentials: CredentialBody): GlobalAddressesClient {
    return new GlobalAddressesClient({ credentials })
  }
}
