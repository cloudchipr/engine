import { ProviderResource } from '../provider-resource'
import { Metric } from '../../metric'

// Elastic Compute Cloud
export class Ec2 extends ProviderResource {
  cpu?: Metric;
  networkIn?: Metric;
  networkOut?: Metric;

  constructor (
    readonly id: string,
    readonly imageId: string,
    readonly type: string,
    readonly age: string,
    readonly tenancy: string,
    readonly availabilityZone: string,
    readonly isSpotInstance: boolean,
    readonly platformDetails?: string,
    readonly usageOperation?: string,
    readonly nameTag?: string,
    readonly _c8rRegion?: string,
    readonly _c8rAccount?: string
  ) { super() }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }

  hasPlatformDetails (): boolean {
    return this.platformDetails !== undefined && this.usageOperation !== undefined
  }
}
