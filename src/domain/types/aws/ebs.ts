import { ProviderResource } from '../provider-resource'

export class Ebs extends ProviderResource {
  constructor (
      readonly id: string,
      readonly size: number,
      readonly state: string,
      readonly type: string,
      readonly availabilityZone: string,
      readonly age?: string,
      readonly nameTag?: string
  ) { super() }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }

  get pricePerMonth (): number {
    return <number> this._pricePerMonthGB * this.size
  }
}
