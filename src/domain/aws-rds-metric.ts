import { MetricDetails } from './metric-details'

export class AwsRdsMetric {
  constructor (
    public databaseConnections: MetricDetails[] = []
  ) {}

  static getPropertyNameFromString (prop: string): string {
    switch (prop) {
      case 'DatabaseConnections':
        return 'databaseConnections'
      default:
        throw new Error(`Invalid property name for AwsRdsMetric was provided [${prop}]`)
    }
  }
}
