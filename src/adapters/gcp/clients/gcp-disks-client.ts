import { GcpClientInterface } from './gcp-client-interface'
import { DisksClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Disks } from '../../../domain/types/gcp/disks'
import { Label } from '../../../domain/types/gcp/shared/label'
import GcpBaseClient from './gcp-base-client'

export default class GcpDisksClient extends GcpBaseClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpDisksClient.getClient().list({ project: 'cloud-test-340820', zone: region }))
    }
    return promises
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Disks(
            instance.name,
            StringHelper.splitAndGetAtIndex(instance.type, '/', -1),
            instance.users?.length > 0,
            instance.status,
            (parseFloat(instance.sizeGb) | 0) * 1073741824,
            instance.creationTimestamp,
            StringHelper.splitAndGetAtIndex(instance.zone, '/', -1),
            Label.createInstances(instance.labels)
          ))
        })
      })
    })
    return new Response<Type>(data)
  }

  private static getClient (): DisksClient {
    return new DisksClient()
  }
}
