import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Disks extends ProviderResource {
  constructor (
    readonly name: string,
    readonly zone: string,
    readonly type?: string,
    readonly hasAttachments?: boolean,
    readonly status?: string,
    readonly size?: number,
    readonly age?: string,
    readonly labels?: Label[],
    readonly _project?: string
  ) { super() }

  getRegion (): string {
    return this.zone.split('-').slice(0, -1).join('-')
  }

  getOwner (): string | undefined {
    return this._project
  }
}
