import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Lb extends ProviderResource {
  constructor (
    readonly name: string,
    readonly region: string,
    readonly type?: string,
    readonly global?: boolean,
    readonly age?: string,
    readonly labels?: Label[],
    readonly _project?: string
  ) { super() }

  getRegion (): string {
    return this.region
  }

  getOwner (): string | undefined {
    return this._project
  }
}
