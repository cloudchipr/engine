import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpLbEipMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { Eip } from '../../../domain/types/gcp/eip'
import { google } from 'googleapis'
import { GcpSubCommand } from '../gcp-sub-command'
import { GcpApiError } from '../../../exceptions/gcp-api-error'
import { GcpBaseClient } from './gcp-base-client'
import { GcpClientInterface } from './gcp-client-interface'

export class GcpEipClient extends GcpBaseClient implements GcpClientInterface {
  async collectAll (): Promise<Response<Eip>> {
    let data: any[] = []
    const errors: any[] = []
    try {
      const response: any = await google.compute('v1').addresses.aggregatedList({
        auth: this.authClient,
        project: this.projectId
      })
      data = this.formatCollectResponse(response)
    } catch (e: any) {
      errors.push(new GcpApiError(GcpSubCommand.EIP_SUBCOMMAND, e))
    }
    return new Response<Eip>(data, errors)
  }

  async clean (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return await google.compute('v1').globalAddresses.delete({
        address: request.id,
        auth: this.authClient,
        project: this.projectId
      })
    } else {
      return await google.compute('v1').addresses.delete({
        address: request.id,
        region: metadata.region,
        auth: this.authClient,
        project: this.projectId
      })
    }
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    return metadata.global || !!metadata.region
  }

  private formatCollectResponse (response: any): Eip[] {
    const data: Eip[] = []
    Object.keys(response.data.items).forEach(key => {
      if ('addresses' in response.data.items[key] && Array.isArray(response.data.items[key].addresses)) {
        response.data.items[key].addresses?.forEach((v: any) => {
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
    return data
  }
}
