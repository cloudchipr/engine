import { GcpClientInterface } from './gcp-client-interface'
import { DisksClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Disks } from '../../../domain/types/gcp/disks'
import { Label } from '../../../domain/types/gcp/shared/label'
import GcpBaseClient from './gcp-base-client'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpVmDisksMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { GcpPriceCalculator } from '../gcp-price-calculator'
import { CredentialBody } from 'google-auth-library'

export class GcpDisksClient implements GcpClientInterface {
  static async collectAll<Type> (credentials: CredentialBody, project: string): Promise<Response<Type>> {
    const client = new DisksClient({ credentials })
    const response = client.aggregatedListAsync({ project })
    return
  }

  protected async formatCollectResponse<Type> (response: any): Promise<Response<Type>> {
    const data: any[] = []
    for await (const [, value] of response) {
      value.disks?.forEach((v: any) => {
        data.push(new Disks(
          v.name,
          StringHelper.splitAndGetAtIndex(v.zone, '/', -1) || '',
          StringHelper.splitAndGetAtIndex(v.type, '/', -1) || '',
          (parseFloat(v.sizeGb) | 0) * 1073741824,
          v.users?.length > 0,
          v.status,
          v.creationTimestamp,
          Label.createInstances(v.labels)
        ))
      })
    }
    return new Response<Type>(data)
  }
}
