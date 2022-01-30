export class AwsMetricDetails {
  constructor (
    readonly timestamp?: Date,
    readonly unit?: string,
    readonly average?: number,
    readonly minimum?: number,
    readonly maximum?: number
  ) {}
}
