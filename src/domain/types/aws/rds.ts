import { ProviderResource } from '../provider-resource'

export class Rds extends ProviderResource {
  constructor (
    readonly id: string,
    readonly instanceType: string,
    readonly storageType: string,
    readonly averageConnections: number,
    readonly dbType: string,
    readonly age: string,
    readonly availabilityZone: string,
    readonly nameTag?: string
  ) {
    super()
  }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }
}
