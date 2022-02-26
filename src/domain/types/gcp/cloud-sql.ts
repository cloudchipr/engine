import { Label } from './shared/label'

export class CloudSql {
  constructor (
    readonly id: string,
    readonly type?: string,
    readonly connections?: any,
    readonly region?: string,
    readonly pricePerMonth?: number,
    readonly labels?: Label[]
  ) {}
}
