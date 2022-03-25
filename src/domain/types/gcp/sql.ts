import { Label } from './shared/label'
import { Metric } from '../../metric'
import { ProviderResource } from '../provider-resource'

export class Sql extends ProviderResource {
  constructor (
    readonly id: string,
    readonly region: string,
    readonly type?: string,
    readonly multiAz?: boolean,
    readonly connections?: Metric,
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
