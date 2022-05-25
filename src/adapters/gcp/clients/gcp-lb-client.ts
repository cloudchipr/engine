import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { Lb } from '../../../domain/types/gcp/lb'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpLbEipMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { google } from 'googleapis'
import { Vm } from '../../../domain/types/gcp/vm'

export class GcpLbClient {
  static async collectAll<Type> (auth: any, project: string): Promise<Response<Type>> {
    const data: any[] = []
    const result: any = await google.compute('v1').forwardingRules.aggregatedList({ auth, project })
    Object.keys(result.data.items).forEach(key => {
      if ('forwardingRules' in result.data.items[key] && Array.isArray(result.data.items[key].forwardingRules)) {
        result.data.items[key].forwardingRules?.forEach((v: any) => {
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
    return new Response<Type>(data)
  }

  static async collectAllTargetPool (auth: any, project: string): Promise<{[K: string]: string[]}> {
    const data: {[K: string]: string[]} = {}
    const result: any = await google.compute('v1').targetPools.aggregatedList({ auth, project })
    Object.keys(result.data.items).forEach(key => {
      if ('targetPools' in result.data.items[key] && Array.isArray(result.data.items[key].targetPools)) {
        result.data.items[key].targetPools?.forEach((v: any) => {
          for (const instance of (v.instances || [])) {
            if (!(v.name in data)) {
              data[v.name] = []
            }
            data[v.name].push(StringHelper.splitAndGetAtIndex(instance, '/', -1) || '')
          }
        })
      }
    })
    return data
  }

  static setAttachmentValue (lb: Lb[], vm: Vm[], targetPools: {[K: string]: string[]}): void {
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

  static clean (auth: any, project: string, request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return google.compute('v1').globalForwardingRules.delete({ forwardingRule: request.id, auth, project })
    } else {
      return google.compute('v1').forwardingRules.delete({ forwardingRule: request.id, region: metadata.region, auth, project })
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
