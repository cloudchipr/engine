import { GcpClientInterface } from './gcp-client-interface'
import { GlobalForwardingRulesClient, ForwardingRulesClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { Lb } from '../../../domain/types/gcp/lb'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import GcpBaseClient from './gcp-base-client'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import {
  CleanGcpLbEipMetadataInterface
} from '../../../request/clean/clean-request-resource-metadata-interface'

export default class GcpLbClient extends GcpBaseClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpLbClient.getForwardingRulesClient().list({ project: 'cloud-test-340820', region }))
    }
    promises.push(GcpLbClient.getGlobalForwardingRulesClient().list({ project: 'cloud-test-340820' }))
    return promises
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return GcpLbClient.getGlobalForwardingRulesClient().delete({ forwardingRule: request.id, project: 'cloud-test-340820' })
    } else {
      return GcpLbClient.getForwardingRulesClient().delete({ forwardingRule: request.id, region: metadata.region, project: 'cloud-test-340820' })
    }
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    return metadata.global || !!metadata.region
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Lb(
            instance.name,
            StringHelper.splitAndGetAtIndex(instance.region, '/', -1) || '',
            instance.IPProtocol,
            !('region' in instance),
            instance.creationTimestamp,
            Label.createInstances(instance.labels)
          ))
        })
      })
    })
    return new Response<Type>(data)
  }

  private static getForwardingRulesClient (): ForwardingRulesClient {
    return new ForwardingRulesClient()
  }

  private static getGlobalForwardingRulesClient (): GlobalForwardingRulesClient {
    return new GlobalForwardingRulesClient()
  }
}
