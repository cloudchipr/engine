import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpLbEipMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { Eip } from '../../../domain/types/gcp/eip'
import { google } from 'googleapis'
import { GcpSubCommand } from '../gcp-sub-command'
import { GcpApiError } from '../../../exceptions/gcp-api-error'

export class GcpEipClient {
  static async collectAll<Type> (auth: any, project: string): Promise<Response<Type>> {
    const data: any[] = []
    const errors: any[] = []
    try {
      const result: any = await google.compute('v1').addresses.aggregatedList({
        auth,
        project
      })
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
    } catch (e: any) {
      errors.push(new GcpApiError(GcpSubCommand.EIP_SUBCOMMAND, e))
    }
    return new Response<Type>(data, errors)
  }

  static clean (auth: any, project: string, request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return google.compute('v1').globalAddresses.delete({ address: request.id, auth, project })
    } else {
      return google.compute('v1').addresses.delete({ address: request.id, region: metadata.region, auth, project })
    }
  }

  static isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    return metadata.global || !!metadata.region
  }
}
