import { Operators } from '@root/filters/operators'
import { FilterInterface } from '@root/filter-Interface'
import { FIlterBuilderInterface } from '@root/fIlter-builder-interface'

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
