import { Label } from './shared/label'
import { Metric } from '../../metric'

export class Sql {
  constructor (
    readonly id: string,
    readonly type?: string,
    readonly multiAz?: boolean,
    readonly connections?: Metric,
    readonly region?: string,
    readonly pricePerMonth?: number,
    readonly labels?: Label[],
    readonly project?: string
  ) {}
}
