import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Eip extends ProviderResource {
  constructor (
    readonly ip: string,
    readonly name?: string,
    readonly region?: string,
    readonly labels?: Label[],
    readonly _project?: string
  ) { super() }

  getRegion (): string {
    return this.region ?? 'N/A'
  }

  getOwner (): string {
    return this._project ?? 'N/A'
  }
}
