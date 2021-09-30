import { Operators } from './operators'
import { FilterInterface } from '../filter-Interface'
import { FIlterBuilderInterface } from '../fIlter-builder-interface'

export class FilterExpression implements FilterInterface {
  public resource: string;
  public operator: Operators | undefined;
  public value?: string;
  public since?: string;

  constructor (
    field: string,
    operator: Operators,
    value?: string,
    since?: string
  ) {
    this.resource = field
    this.operator = operator as Operators
    this.value = value
    this.since = since
  }

  public build (builder: FIlterBuilderInterface): object {
    return builder.buildFilterExpression(this)
  }
}
