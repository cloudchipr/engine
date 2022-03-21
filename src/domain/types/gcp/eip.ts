import { Label } from './shared/label'

export class Eip {
  constructor (
    readonly ip: string,
    readonly name?: string,
    readonly region?: string,
    readonly pricePerMonth?: number,
    readonly labels?: Label[],
    readonly project?: string
  ) {}
}
