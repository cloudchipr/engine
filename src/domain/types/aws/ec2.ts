import { ProviderResource } from '../provider-resource'

// Elastic Compute Cloud
export class Ec2 extends ProviderResource {
  constructor (
    readonly id: string,
    readonly imageId: string,
    readonly type: string,
    readonly cpu: number,
    readonly networkIn: number,
    readonly networkOut: number,
    readonly age: string,
    readonly tenancy: string,
    readonly availabilityZone: string,
    readonly isSpotInstance: boolean,
    readonly nameTag?: string,
    readonly _c8rRegion?: string,
    readonly _c8rAccount?: string
  ) { super() }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }
}
