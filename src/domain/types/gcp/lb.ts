import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Lb extends ProviderResource {
  constructor (
    readonly name: string,
    readonly region: string,
    public hasAttachments: boolean,
    readonly type?: string,
    readonly global?: boolean,
    readonly age?: string,
    readonly target?: string,
    readonly labels?: Label[],
    readonly _project?: string
  ) { super() }

  getRegion (): string {
    return this.region
  }

  getOwner (): string | undefined {
    return this._project
  }

  getId (): string {
    return this.name
  }
}
