import { Label } from './shared/label'
import { MetricDetails } from '../../metric-details'
import { Metric } from '../../metric'
import { ProviderResource } from '../provider-resource'

export class Vm extends ProviderResource {
  constructor (
    readonly name: string,
    readonly machineType?: string,
    readonly age?: string,
    readonly zone?: string,
    readonly cpu?: Metric,
    readonly networkIn?: Metric,
    readonly networkOut?: Metric,
    public metrics?: VmMetric,
    readonly labels?: Label[],
    readonly project?: string
  ) { super(zone?.split('-').slice(0, -1).join('-') || '', project) }
}

export class VmMetric {
  constructor (
    public cpu: MetricDetails[] = [],
    public networkIn: MetricDetails[] = [],
    public networkOut: MetricDetails[] = []
  ) {}
}
