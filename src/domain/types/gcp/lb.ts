import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Lb extends ProviderResource {
  constructor (
    readonly name: string,
    readonly type?: string,
    readonly global?: boolean,
    readonly age?: string,
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
