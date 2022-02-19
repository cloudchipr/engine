import { GcpClientInterface } from './gcp-client-interface'
import { InstancesClient } from '@google-cloud/compute'

export default class GcpVmClient implements GcpClientInterface {
  getCollectCommands (): any {
    return GcpVmClient.getClient().aggregatedListAsync({ project: 'cloud-test-340820', maxResults: 1000 })
  }

  async formatCollectResponse (response: any): Promise<any> {
    return response
  }

  private static getClient (): InstancesClient {
    return new InstancesClient()
  }
}
