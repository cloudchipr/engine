import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Disks } from '../../../domain/types/gcp/disks'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpVmDisksMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { google } from 'googleapis'

export class GcpDisksClient {
  static async collectAll<Type> (auth: any, project: string): Promise<Response<Type>> {
    const data: any[] = []
    const result: any = await google.compute('v1').disks.aggregatedList({ auth, project })
    Object.keys(result.data.items).forEach(key => {
      if ('disks' in result.data.items[key] && Array.isArray(result.data.items[key].disks)) {
        result.data.items[key].disks?.forEach((v: any) => {
          data.push(new Disks(
            v.name,
            StringHelper.splitAndGetAtIndex(v.zone, '/', -1) || '',
            StringHelper.splitAndGetAtIndex(v.type, '/', -1) || '',
            (parseFloat(v.sizeGb) | 0) * 1073741824,
            true,
            v.status,
            v.creationTimestamp,
            Label.createInstances(v.labels)
          ))
        })
      }
    })
    return new Response<Type>(data)
  }

  static clean (auth: any, project: string, request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return google.compute('v1').disks.delete({ disk: request.id, zone: metadata.zone, auth, project })
  }

  static isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return !!metadata.zone
  }
}
