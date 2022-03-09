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

  static getGcpCpuUtilization (object: any): Metric {
    return MetricsHelper.getGcpMetric(object, 'compute.googleapis.com/instance/cpu/utilization')
  }

  static getNetworkIn (object: any): Metric

  static getGcpNetworkIn (object: any): Metric {
    return MetricsHelper.getGcpMetric(object, 'compute.googleapis.com/instance/network/received_bytes_count')
  }

  static getNetworkOut (object: any): Metric {
    return MetricsHelper.getMetric(object, 'AWS/EC2.NetworkOut')
  }

  static getGcpNetworkOut (object: any): Metric {
    return MetricsHelper.getGcpMetric(object, 'compute.googleapis.com/instance/network/sent_bytes_count')
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

  private static getGcpMetric (object: any, key: string): Metric {
    const metricObject = object?.['c7n.metrics']?.[this.getMetricKey(object, key)] ?? {}
    if (!('points' in metricObject)) {
      return new Metric(0, this.getMetricType({}, ''), '')
    }
    const points = metricObject.points
    const interval = points[0].interval
    const value = points[0].value.doubleValue ?? points[0].value.int64Value ?? 0
    const days = Math.abs((new Date(interval.startTime)).getTime() - (new Date(interval.endTime)).getTime()) / (1000 * 3600 * 24)
    return new Metric(value / (days || 1), this.getMetricType(object, key), '')
  }

  private static getMetricType (object: any, key: string): Statistics {
    if (object?.['c7n.metrics'] === undefined) {
      return Statistics.Unspecified
    }

    switch (true) {
      case (key + '.Average' in object?.['c7n.metrics']):
      case (key + '.ALIGN_MEAN.REDUCE_NONE' in object?.['c7n.metrics']):
        return Statistics.Average
      case (key + '.Maximum' in object?.['c7n.metrics']):
      case (key + '.ALIGN_MAX.REDUCE_NONE' in object?.['c7n.metrics']):
        return Statistics.Maximum
      case (key + '.Minimum' in object?.['c7n.metrics']):
      case (key + '.ALIGN_MIN.REDUCE_NONE' in object?.['c7n.metrics']):
        return Statistics.Minimum
      case (key + '.Sum' in object?.['c7n.metrics']):
      case (key + '.ALIGN_SUM.REDUCE_NONE' in object?.['c7n.metrics']):
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
      case (key + '.ALIGN_MEAN.REDUCE_NONE' in object?.['c7n.metrics']):
        return key + '.ALIGN_MEAN.REDUCE_NONE'
      case (key + '.ALIGN_MAX.REDUCE_NONE' in object?.['c7n.metrics']):
        return key + '.ALIGN_MAX.REDUCE_NONE'
      case (key + '.ALIGN_MIN.REDUCE_NONE' in object?.['c7n.metrics']):
        return key + '.ALIGN_MIN.REDUCE_NONE'
      case (key + '.ALIGN_SUM.REDUCE_NONE' in object?.['c7n.metrics']):
        return key + '.ALIGN_SUM.REDUCE_NONE'
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
