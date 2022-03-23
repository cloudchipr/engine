import { GcpClientInterface } from './gcp-client-interface'
import { GlobalForwardingRulesClient, ForwardingRulesClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { Lb } from '../../../domain/types/gcp/lb'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import GcpBaseClient from './gcp-base-client'

export default class GcpLbClient extends GcpBaseClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpLbClient.getForwardingRulesClient().list({ project: 'cloud-test-340820', region }))
    }
    promises.push(GcpLbClient.getGlobalForwardingRulesClient().list({ project: 'cloud-test-340820' }))
    return promises
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Lb(
            instance.name,
            instance.IPProtocol,
            !('region' in instance),
            instance.creationTimestamp,
            StringHelper.splitAndGetAtIndex(instance.region, '/', -1),
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
