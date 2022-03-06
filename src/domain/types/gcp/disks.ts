import { Label } from './shared/label'

export class Disks {
  constructor (
    readonly name: string,
    readonly type?: string,
    readonly hasAttachments?: boolean,
    readonly status?: string,
    readonly size?: number,
    readonly age?: string,
    readonly zone?: string,
    readonly pricePerMonth?: number,
    readonly labels?: Label[]
  ) {}
}
