import { Label } from './shared/label'
import { Metric } from '../../metric'
import { ProviderResource } from '../provider-resource'
import { MetricDetails } from '../../metric-details'

export class Sql extends ProviderResource {
  constructor (
    readonly id: string,
    readonly region: string,
    readonly type?: string,
    readonly multiAz?: boolean,
    readonly cpu?: number,
    readonly ram?: number,
    readonly storage?: number,
    readonly age?: string,
    readonly connections?: Metric,
    public metrics?: SqlMetric,
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
    return this.id
  }
}

export class SqlMetric {
  constructor (
    public databaseConnections: MetricDetails[] = []
  ) {}
}
