import { ProviderResource } from '../provider-resource'
import { Metric } from '../../metric'

// Elastic Compute Cloud
export class Ec2 extends ProviderResource {
  constructor (
    readonly id: string,
    readonly imageId: string,
    readonly type: string,
    readonly cpu: Metric,
    readonly networkIn: Metric,
    readonly networkOut: Metric,
    readonly age: string,
    readonly tenancy: string,
    readonly availabilityZone: string,
    readonly isSpotInstance: boolean,
    readonly platformDetails: string,
    readonly usageOperation: string,
    readonly nameTag?: string,
    readonly _c8rRegion?: string,
    readonly _c8rAccount?: string
  ) { super() }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }
}
