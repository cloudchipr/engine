import { Metric } from '../domain/metric'
import { Statistics } from '../domain/statistics'

export class MetricsHelper {
  static getDatabaseConnections (object: any): Metric {
    return MetricsHelper.getMetric(object, 'AWS/RDS.DatabaseConnections')
  }

  static getDatabaseIOPS (object: any): Metric {
    return MetricsHelper.getMetric(object, 'AWS/RDS.IOPS')
  }

  static getCpuUtilization (object: any): Metric {
    return MetricsHelper.getMetric(object, 'AWS/EC2.CPUUtilization')
  }

  static getNetworkIn (object: any): Metric {
    return MetricsHelper.getMetric(object, 'AWS/EC2.NetworkIn')
  }

  static getNetworkOut (object: any): Metric {
    return MetricsHelper.getMetric(object, 'AWS/EC2.NetworkOut')
  }

  private static getMetric (object: any, key: string): Metric {
    const metricObject = object?.['c7n.metrics']?.[this.getMetricKey(object, key)]
    const sum = metricObject?.reduce(function (prev: number, current: C7nMetric) {
      return prev + (current.Average ?? current.Maximum ?? current.Minimum ?? current.Sum)
    }, 0)

    return new Metric(
      sum > 0 ? sum / metricObject?.length : 0,
      this.getMetricType(object, key),
      ''
    )
  }

  private static getMetricType (object: any, key: string): Statistics {
    switch (true) {
      case (key + '.Average' in object?.['c7n.metrics']):
        return Statistics.Average
      case (key + '.Maximum' in object?.['c7n.metrics']):
        return Statistics.Maximum
      case (key + '.Minimum' in object?.['c7n.metrics']):
        return Statistics.Minimum
      case (key + '.Sum' in object?.['c7n.metrics']):
        return Statistics.Sum
      default:
        return Statistics.Unspecified
    }
  }

  private static getMetricKey (object: any, key: string): string {
    switch (true) {
      case (key + '.Average' in object?.['c7n.metrics']):
        return key + '.Average'
      case (key + '.Maximum' in object?.['c7n.metrics']):
        return key + '.Maximum'
      case (key + '.Minimum' in object?.['c7n.metrics']):
        return key + '.Minimum'
      case (key + '.Sum' in object?.['c7n.metrics']):
        return key + '.Sum'
      default:
        return ''
    }
  }
}

class C7nMetric {
  public Average: number;
  public Maximum: number;
  public Minimum: number;
  public Sum: number;
  public Unit: string;

  constructor (Average: number, Maximum: number, Minimum: number, Sum: number, Unit: string) {
    this.Average = Average
    this.Maximum = Maximum
    this.Minimum = Minimum
    this.Sum = Sum
    this.Unit = Unit
  }
}
