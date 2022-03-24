import { ProviderResource } from '../provider-resource'
import { Tag } from '../../tag'

export class Eip extends ProviderResource {
  constructor (
    readonly ip: string,
    readonly region: string,
    readonly allocationId?: string,
    readonly associationId?: string,
    readonly domain?: string,
    readonly instanceId?: string,
    readonly nameTag?: string,
    readonly tags?: Tag[],
    readonly account?: string
  ) { super(region, account) }
}
