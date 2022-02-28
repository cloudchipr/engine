import { GcpClientInterface } from './gcp-client-interface'
import { InstancesClient } from '@google-cloud/compute'
import { Vm } from '../../../domain/types/gcp/vm'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CloudBillingClient, CloudCatalogClient } from '@google-cloud/billing'
import fs from 'fs'

export default class GcpVmClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpVmClient.getClient().list({ project: 'cloud-test-340820', zone: region }))
    }
    return promises
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Vm(
            instance.name,
            StringHelper.splitAndGetAtIndex(instance.machineType, '/', -1),
            instance.creationTimestamp,
            StringHelper.splitAndGetAtIndex(instance.zone, '/', -1),
            undefined,
            undefined,
            undefined,
            undefined,
            Label.createInstances(instance.labels)
          ))
        })
      })
    })
    // const client1 = new CloudBillingClient()
    // conat b = client1.listBillingAccounts()
    const client2 = new CloudCatalogClient()
    const a = await client2.listServices()
    a?.forEach(s => {
      if (Array.isArray(s)) {
        s?.forEach(y => {
          if (y.displayName === 'Compute Engine') {
            console.log(y)
          }
        })
      }
    })
    // 6F81-5844-456A
    const b = await client2.listSkus({parent: 'services/6F81-5844-456A'})
    await fs.promises.writeFile('./aaa.json', JSON.stringify(b), 'utf8')
    // b?.forEach(s => {
    //   if (Array.isArray(s)) {
    //     s?.forEach(y => {
    //       if (y.displayName === 'Compute Engine') {
    //         console.log(y)
    //       }
    //     })
    //   }
    // })
    return new Response<Type>(data)
  }

  private static getClient (): InstancesClient {
    return new InstancesClient()
  }
}
