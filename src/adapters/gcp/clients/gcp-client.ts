import { Response } from '../../../responses/response'
import { EngineRequest } from '../../../engine-request'
import { GcpClientInterface } from './gcp-client-interface'
import GcpVmClient from './gcp-vm-client'
import { InstancesClient } from '@google-cloud/compute'

export default class GcpClient {
  private gcpClientInterface: GcpClientInterface;

  constructor (subcommand: string) {
    this.gcpClientInterface = GcpClient.getAwsClient(subcommand)
  }

  async collectResources (): Promise<any> {
    const resources = await (new InstancesClient()).aggregatedListAsync({ project: 'cloud-test-340820', maxResults: 1000 })
    console.log('Instances found:')
    console.log(resources)
    console.log('================================================')
    for await (const [zone, instancesObject] of resources) {
      const instances = instancesObject.instances
      if (instances && instances.length > 0) {
        console.log(` ${zone}`)
        for (const instance of instances) {
          console.log(` - ${instance.name} (${instance.machineType})`)
        }
      }
    }
    return resources
  }

  private static getAwsClient (subcommand: string): GcpClientInterface {
    switch (subcommand) {
      case 'vm':
        return new GcpVmClient()
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
