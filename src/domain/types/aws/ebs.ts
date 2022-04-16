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
    readonly _account?: string
  ) { super() }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }

  getOwner (): string | undefined {
    return this._account
  }

  getId (): string {
    return this.id
  }
}
