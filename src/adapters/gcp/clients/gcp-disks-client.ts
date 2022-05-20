import { DisksClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Disks } from '../../../domain/types/gcp/disks'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CredentialBody } from 'google-auth-library'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpVmDisksMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'

export class GcpDisksClient {
  static async collectAll<Type> (credentials: CredentialBody, project: string): Promise<Response<Type>> {
    const response = GcpDisksClient.getClient(credentials).aggregatedListAsync({ project })
    return GcpDisksClient.formatCollectResponse(response)
  }

  static getCleanCommands (credentials: CredentialBody, project: string, request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return GcpDisksClient.getClient(credentials).delete({ disk: request.id, zone: metadata.zone, project })
  }

  static isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return !!metadata.zone
  }

  private static async formatCollectResponse<Type> (response: any): Promise<Response<Type>> {
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

  private static getClient (credentials: CredentialBody): DisksClient {
    return new DisksClient({ credentials })
  }
}
