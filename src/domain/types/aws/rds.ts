import { ProviderResource } from '../provider-resource'

export class Rds extends ProviderResource {
  constructor (
    readonly id: string,
    readonly instanceType: string,
    readonly storageType: string,
    readonly averageConnections: number,
    readonly averageIOPS: number,
    readonly dbType: string,
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

  get pricePerMonth (): number {
    console.log(this.averageIOPS);
    return <number> this._pricePerMonthGB // * this.averageIOPS @todo check this later
  }
}
