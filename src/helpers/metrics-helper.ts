export class MetricsHelper {
  static getDatabaseConnections (object: any): number {
    return MetricsHelper.getMetricAverage(object, 'AWS/RDS.DatabaseConnections.Average')
  }

  static getCpuUtilization (object: any): number {
    return MetricsHelper.getMetricAverage(object, 'AWS/EC2.CPUUtilization.Average')
  }

  static getNetworkIn (object: any): number {
    return MetricsHelper.getMetricAverage(object, 'AWS/EC2.NetworkIn.Average')
  }

  static getNetworkOut (object: any): number {
    return MetricsHelper.getMetricAverage(object, 'AWS/EC2.NetworkOut.Average')
  }

  private static getMetricAverage (object: any, key: string) {
    const sum = object?.['c7n.metrics']?.[key]?.reduce(function (prev: Metric, current: Metric) {
      return prev.Average + current.Average
    })

    return sum > 0 ? sum / object?.['c7n.metrics']?.[key]?.length : 0
  }
}

class Metric {
  public Average: number;
  public Unit: string;

  constructor (Average: number, Unit: string) {
    this.Average = Average
    this.Unit = Unit
  }
}
