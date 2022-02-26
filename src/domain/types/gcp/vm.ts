import { Label } from './shared/label'

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
    public cpu: VmMetricDetails[] = [],
    public networkIn: VmMetricDetails[] = [],
    public networkOut: VmMetricDetails[] = []
  ) {}
}

export class VmMetricDetails {
  readonly timestamp: string
  readonly unit?: string
  readonly value: number
  readonly valueType?: string

  constructor (timestamp: string, value: number, target: string) {
    this.timestamp = timestamp
    this.value = value
    switch (target) {
      case 'cpu':
        this.unit = 'Percent'
        this.valueType = 'Average'
        break
    }
  }
}
