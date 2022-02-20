import { GcpClientInterface } from './gcp-client-interface'
import { GlobalForwardingRulesClient, ForwardingRulesClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { Lb } from '../../../domain/types/gcp/lb'

export default class GcpLbClient implements GcpClientInterface {
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
        r?.forEach((i: any) => {
          data.push(new Lb(
            i.name,
            i.IPProtocol,
            i.region
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
