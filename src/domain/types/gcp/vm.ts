import { Label } from './shared/label'
import { MetricDetails } from '../../metric-details'
import { Metric } from '../../metric'

export class Vm {
  constructor (
    readonly name: string,
    readonly machineType?: string,
    readonly age?: string,
    readonly zone?: string,
    readonly cpu?: Metric,
    readonly networkIn?: Metric,
    readonly networkOut?: Metric,
    public metrics?: VmMetric,
    readonly pricePerMonth?: number,
    readonly labels?: Label[],
    readonly project?: string
  ) {}
}

export class VmMetric {
  constructor (
    public cpu: MetricDetails[] = [],
    public networkIn: MetricDetails[] = [],
    public networkOut: MetricDetails[] = []
  ) {}
}
