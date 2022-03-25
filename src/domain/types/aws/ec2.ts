import { ProviderResource } from '../provider-resource'
import { Metric } from '../../metric'
import { AwsEc2Metric } from '../../aws-ec2-metric'
import { Tag } from '../../tag'

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
    public metrics?: AwsEc2Metric,
    readonly nameTag?: string,
    readonly tags?: Tag[],
    readonly _account?: string
  ) { super() }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }

  getOwner (): string | undefined {
    return this._account
  }
}
