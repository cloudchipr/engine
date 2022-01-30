import { AwsMetricDetails } from './aws-metric-details'

export class AwsMetric {
  constructor (
    public cpu: AwsMetricDetails[] = [],
    public networkIn: AwsMetricDetails[] = [],
    public networkOut: AwsMetricDetails[] = []
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
        throw new Error(`Invalid property name for AwsMetric was provided [${prop}]`)
    }
  }
}
