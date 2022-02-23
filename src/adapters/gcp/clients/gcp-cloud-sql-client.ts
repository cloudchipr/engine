import { GcpClientInterface } from './gcp-client-interface'
import { DisksClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { CloudSql } from '../../../domain/types/gcp/cloud-sql'

export default class GcpCloudSqlClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpCloudSqlClient.getClient().list({ project: 'cloud-test-340820', zone: region }))
    }
    return promises
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new CloudSql(
            instance.name,
            StringHelper.splitAndGetAtIndex(instance.zone, '/', -1),
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
