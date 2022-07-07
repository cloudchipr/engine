import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Disks } from '../../../domain/types/gcp/disks'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpVmDisksMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { google } from 'googleapis'
import { GcpSubCommand } from '../gcp-sub-command'
import { GcpApiError } from '../../../exceptions/gcp-api-error'
import { GcpBaseClient } from './gcp-base-client'
import { GcpClientInterface } from './gcp-client-interface'

export class GcpDisksClient extends GcpBaseClient implements GcpClientInterface {
  async collectAll (): Promise<Response<Disks>> {
    let data: any[] = []
    const errors: any[] = []
    try {
      const response: any = await google.compute('v1').disks.aggregatedList({
        auth: this.authClient,
        project: this.projectId,
        filter: 'status != DELETING AND status != FAILED'
      })
      data = this.formatCollectResponse(response)
    } catch (e: any) {
      errors.push(new GcpApiError(GcpSubCommand.DISKS_SUBCOMMAND, e))
    }
    return new Response<Disks>(data, errors)
  }

  async clean (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return await google.compute('v1').disks.delete({
      disk: request.id,
      zone: metadata.zone,
      auth: this.authClient,
      project: this.projectId
    })
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return !!metadata.zone
  }

  private formatCollectResponse (response: any): Disks[] {
    const data: Disks[] = []
    Object.keys(response.data.items).forEach(key => {
      if ('disks' in response.data.items[key] && Array.isArray(response.data.items[key].disks)) {
        response.data.items[key].disks?.forEach((v: any) => {
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
    })
    return data
  }
}
