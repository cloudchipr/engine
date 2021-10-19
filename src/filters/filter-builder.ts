import { FilterList } from './filter-list'
import { FilterExpression } from './filter-expression'
import { Operators } from './operators'

export class FilterBuilder {
  private readonly filters: FilterList;
  private connector: string = 'and';
  private resourceName: string = '';

  constructor () {
    this.filters = new FilterList()
  }

  resource (resource: string): FilterBuilder {
    this.resourceName = resource
    return this
  }

  isEmpty (): FilterBuilder {
    this.addToList(new FilterExpression(this.resourceName, Operators.IsEmpty))
    return this
  }

  isAbsent (): FilterBuilder {
    this.addToList(new FilterExpression(this.resourceName, Operators.IsAbsent))
    return this
  }

  equal (value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(this.resourceName, Operators.Equal, value, since)
    )
    return this
  }

  greaterThan (value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.resourceName,
        Operators.GreaterThan,
        value,
        since
      )
    )
    return this
  }

  greaterThanOrEqualTo (value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.resourceName,
        Operators.GreaterThanEqualTo,
        value,
        since
      )
    )
    return this
  }

  lessThan (value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(this.resourceName, Operators.LessThan, value, since)
    )
    return this
  }

  lessThanOrEqualTo (value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.resourceName,
        Operators.LessThanEqualTo,
        value,
        since
      )
    )
    return this
  }

  and (): FilterBuilder {
    this.connector = 'and'
    return this
  }

  or (): FilterBuilder {
    this.connector = 'or'
    return this
  }

  load (filters: any): FilterBuilder {
    const f = filters.filters[0]

    for (const filter of f.and) {
      this.addToList(
        new FilterExpression(
          filter.resource,
          (Operators as any)[filter.op],
          filter.value ?? null,
          filter.since ?? null
        )
      )
    }

    return this
  }

  toList (): FilterList {
    return this.filters
  }

  private addToList (filter: FilterExpression | FilterList): void {
    if (this.connector === 'and') {
      this.filters.and(filter)
    } else {
      this.filters.or(filter)
    }
  }
}
