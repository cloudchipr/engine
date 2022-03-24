import { ProviderResource } from '../provider-resource'
import { Tag } from '../../tag'

export class Ebs extends ProviderResource {
  constructor (
    readonly id: string,
    readonly size: number,
    readonly state: string,
    readonly type: string,
    readonly availabilityZone: string,
    readonly hasAttachments: boolean,
    readonly age?: string,
    readonly nameTag?: string,
    readonly tags?: Tag[],
    readonly account?: string
  ) { super(availabilityZone.slice(0, -1), account) }

  get pricePerMonth (): number {
    return <number> this._pricePerMonthGB * this.size
  }
}
