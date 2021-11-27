import { ProviderResource } from '../provider-resource'

export class Rds extends ProviderResource {
  constructor (
    readonly id: string,
    readonly instanceType: string,
    readonly storageType: string,
    readonly averageConnections: number,
    readonly averageIOPS: number,
    readonly dbType: string,
    readonly multiAZ: boolean,
    readonly age: string,
    readonly availabilityZone: string,
    readonly nameTag?: string,
    readonly _c8rRegion?: string,
    readonly _c8rAccount?: string
  ) {
    super()
  }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }
}
