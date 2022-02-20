import { GcpClientInterface } from './gcp-client-interface'
import { InstancesClient } from '@google-cloud/compute'
import { Vm } from '../../../domain/types/gcp/vm'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'

export default class GcpVmClient implements GcpClientInterface {
  getCollectCommands (region: string): any[] {
    return [
      GcpVmClient.getClient().list({ project: 'cloud-test-340820', zone: region })
    ]
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Vm(
            instance.name,
            StringHelper.splitAndGetAtIndex(instance.zone, '/', -1),
            StringHelper.splitAndGetAtIndex(instance.machineType, '/', -1)
          ))
        })
      })
    })
    return new Response<Type>(data)
  }

  private static getClient (): InstancesClient {
    return new InstancesClient()
  }
}
