import { GcpClientInterface } from './gcp-client-interface'
import { DisksClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Disks } from '../../../domain/types/gcp/disks'
import { Label } from '../../../domain/types/gcp/shared/label'
import GcpBaseClient from './gcp-base-client'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpVmDisksMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'

export default class GcpDisksClient extends GcpBaseClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpDisksClient.getClient().list({ project: 'cloud-test-340820', zone: region }))
    }
    return promises
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return GcpDisksClient.getClient().delete({ disk: request.id, zone: metadata.zone, project: 'cloud-test-340820' })
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return !!metadata.zone
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Disks(
            instance.name,
            StringHelper.splitAndGetAtIndex(instance.zone, '/', -1) || '',
            StringHelper.splitAndGetAtIndex(instance.type, '/', -1) || '',
            (parseFloat(instance.sizeGb) | 0) * 1073741824,
            instance.users?.length > 0,
            instance.status,
            instance.creationTimestamp,
            Label.createInstances(instance.labels)
          ))
        })
      })
    })
    return new Response<Type>(data)
  }

  private static getClient (): DisksClient {
    return new DisksClient()
  }
}
