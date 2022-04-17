import { Label } from './shared/label'
import { MetricDetails } from '../../metric-details'
import { Metric } from '../../metric'
import { ProviderResource } from '../provider-resource'

export class Vm extends ProviderResource {
  constructor (
    readonly name: string,
    readonly zone: string,
    readonly machineType: string,
    readonly disks: string[],
    public ram?: number,
    public vcpu?: number,
    readonly age?: string,
    readonly cpu?: Metric,
    readonly networkIn?: Metric,
    readonly networkOut?: Metric,
    public metrics?: VmMetric,
    readonly labels?: Label[],
    readonly _project?: string
  ) { super() }

  getRegion (): string {
    return this.zone.split('-').slice(0, -1).join('-')
  }

  getOwner (): string | undefined {
    return this._project
  }

  getId (): string {
    return this.name
  }
}

export class VmMetric {
  constructor (
    public cpu: MetricDetails[] = [],
    public networkIn: MetricDetails[] = [],
    public networkOut: MetricDetails[] = []
  ) {}
}
