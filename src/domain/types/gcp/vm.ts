import { Label } from './shared/label'
import { MetricDetails } from '../../metric-details'

export class Vm {
  constructor (
    readonly name: string,
    readonly machineType?: string,
    readonly age?: string,
    readonly zone?: string,
    public metrics?: VmMetric,
    readonly pricePerMonth?: number,
    readonly labels?: Label[]
  ) {}
}

export class VmMetric {
  constructor (
    public cpu: MetricDetails[] = [],
    public networkIn: MetricDetails[] = [],
    public networkOut: MetricDetails[] = []
  ) {}
}
