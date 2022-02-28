export class MetricDetails {
  constructor (
    readonly timestamp?: Date,
    readonly unit?: string,
    readonly average?: number,
    readonly minimum?: number,
    readonly maximum?: number,
    readonly sum?: number
  ) {}

  public static createInstance (timestamp: Date, value: number, target: string): MetricDetails {
    switch (target) {
      case 'cpu':
        return new MetricDetails(timestamp, 'Percent', 0, 0, value, 0)
      case 'networkIn':
      case 'networkOut':
        return new MetricDetails(timestamp, 'Bytes', 0, 0, 0, value)
    }
    return new MetricDetails()
  }
}
