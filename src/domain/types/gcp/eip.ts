import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Eip extends ProviderResource {
  constructor (
    readonly ip: string,
    readonly region: string,
    readonly name: string,
    readonly type: string,
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
