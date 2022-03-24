import { Label } from './shared/label'
import { Metric } from '../../metric'
import { ProviderResource } from '../provider-resource'

export class Sql extends ProviderResource {
  constructor (
    readonly id: string,
    readonly type?: string,
    readonly multiAz?: boolean,
    readonly connections?: Metric,
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
