import { ProviderResource } from '../provider-resource'

export class Eip extends ProviderResource {
  constructor (
    readonly ip: string,
    readonly region: string,
    readonly nameTag?: string,
    readonly _c8rRegion?: string,
    readonly _c8rAccount?: string
  ) { super() }

  getRegion (): string {
    return this.region
  }
}
