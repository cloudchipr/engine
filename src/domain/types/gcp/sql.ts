import { Label } from './shared/label'

export class Sql {
  constructor (
    readonly id: string,
    readonly type?: string,
    readonly multiAz?: boolean,
    readonly region?: string,
    readonly pricePerMonth?: number,
    readonly labels?: Label[],
    readonly project?: string
  ) {}
}
