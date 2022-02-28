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
        return new MetricDetails(timestamp, 'Percent', undefined, undefined, value, undefined)
      case 'networkIn':
      case 'networkOut':
        return new MetricDetails(timestamp, 'Bytes', undefined, undefined, undefined, value)
    }
    return new MetricDetails()
  }
}
