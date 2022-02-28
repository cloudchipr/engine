import { MetricDetails } from './metric-details'

export class AwsEc2Metric {
  constructor (
    public cpu: MetricDetails[] = [],
    public networkIn: MetricDetails[] = [],
    public networkOut: MetricDetails[] = []
  ) {}

  static getPropertyNameFromString (prop: string): string {
    switch (prop) {
      case 'CPUUtilization':
        return 'cpu'
      case 'NetworkIn':
        return 'networkIn'
      case 'NetworkOut':
        return 'networkOut'
      default:
        throw new Error(`Invalid property name for AwsEc2Metric was provided [${prop}]`)
    }
  }
}
