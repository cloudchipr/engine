import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { Lb } from '../../../domain/types/gcp/lb'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpLbEipMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { google } from 'googleapis'
import { Vm } from '../../../domain/types/gcp/vm'
import { GcpSubCommand } from '../gcp-sub-command'
import { GcpApiError } from '../../../exceptions/gcp-api-error'
import { GcpBaseClient } from './gcp-base-client'
import { GcpClientInterface } from './gcp-client-interface'
import { TargetPool } from './gcp-target-pool-client'

export class GcpLbClient extends GcpBaseClient implements GcpClientInterface {
  async collectAll (): Promise<Response<Lb>> {
    let data: any[] = []
    const errors: any[] = []
    try {
      const response = await google.compute('v1').forwardingRules.aggregatedList({
        auth: this.authClient,
        project: this.projectId
      })
      data = this.formatCollectResponse(response)
    } catch (e: any) {
      errors.push(new GcpApiError(GcpSubCommand.LB_SUBCOMMAND, e))
    }
    return new Response<Lb>(data, errors)
  }

  static setAttachmentValue (lb: Lb[], vm: Vm[], targetPools: TargetPool): void {
    lb.forEach((l: Lb) => {
      const targetType = StringHelper.splitAndGetAtIndex(l.target, '/', -2)
      const targetName = StringHelper.splitAndGetAtIndex(l.target, '/', -1)
      if (targetType === 'targetPools' && targetName !== undefined) {
        if (targetName in targetPools) {
          l.hasAttachments = targetPools[targetName].filter((s) => vm.filter((v: Vm) => v.name === s).length > 0).length > 0
        } else {
          l.hasAttachments = false
        }
      }
    })
  }

  async clean (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return await google.compute('v1').globalForwardingRules.delete({
        forwardingRule: request.id,
        auth: this.authClient,
        project: this.projectId
      })
    } else {
      return await google.compute('v1').forwardingRules.delete({
        forwardingRule: request.id,
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

  private formatCollectResponse (response: any): Lb[] {
    const data: Lb[] = []
    Object.keys(response.data.items).forEach(key => {
      if ('forwardingRules' in response.data.items[key] && Array.isArray(response.data.items[key].forwardingRules)) {
        response.data.items[key].forwardingRules?.forEach((v: any) => {
          data.push(new Lb(
            v.name || '',
            StringHelper.splitAndGetAtIndex(v.region || '', '/', -1) || '',
            true,
            v.IPProtocol || '',
            !('region' in v),
            v.creationTimestamp || '',
            v.target,
            Label.createInstances(v.labels || {})
          ))
        })
      }
    })
    return data
  }
}
