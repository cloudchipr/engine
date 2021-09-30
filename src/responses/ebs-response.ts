import { Ebs } from '../domain/types/aws/ebs'

export class EbsResponse {
  readonly items: Ebs[];

  constructor (items: Ebs[]) {
    this.items = items
  }

  get count (): number {
    return this.items.length
  }
}
