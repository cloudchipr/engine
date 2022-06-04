export class MetricDetails {
  constructor (
    readonly timestamp?: Date,
    readonly unit?: string,
    readonly average?: number,
    readonly minimum?: number,
    readonly maximum?: number,
    readonly sum?: number
  ) {}

  public static createInstance (timestamp: Date, target: string, average?: number, minimum?: number, maximum?: number, sum?: number): MetricDetails {
    let unit: string = ''
    switch (target) {
      case 'cpu':
        unit = 'Percent'
        break
      case 'networkIn':
      case 'networkOut':
        unit = 'Bytes'
        break
    }
    return new MetricDetails(timestamp, unit, average, minimum, maximum, sum)
  }
}
