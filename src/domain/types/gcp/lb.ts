import { Label } from './shared/label'

export class Lb {
  constructor (
    readonly name: string,
    readonly type?: string,
    readonly global?: boolean,
    readonly age?: string,
    readonly region?: string,
    readonly pricePerMonth?: number,
    readonly labels?: Label[]
  ) {}
}
