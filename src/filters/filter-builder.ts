import { FilterList } from './filter-list'
import { FilterExpression } from './filter-expression'
import { Operators } from './operators'
import { Filters } from './filters'
import { FilterValidator } from './filter-validator'
import { Statistics } from '../domain/statistics'

export class FilterBuilder {
  private readonly filters: FilterList;
  private readonly filterValidator: FilterValidator;
  private connector: string = 'and';
  private resourceName: string = '';

  constructor (filterValidator: FilterValidator) {
    this.filters = new FilterList()
    this.filterValidator = filterValidator
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

  equal (value: string, since?: string, statistics?: Statistics): FilterBuilder {
    this.addToList(
      new FilterExpression(this.resourceName, Operators.Equal, value, since, statistics)
    )
    return this
  }

  greaterThan (value: string, since?: string, statistics?: Statistics): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.resourceName,
        Operators.GreaterThan,
        value,
        since,
        statistics
      )
    )
    return this
  }

  greaterThanOrEqualTo (value: string, since?: string, statistics?: Statistics): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.resourceName,
        Operators.GreaterThanEqualTo,
        value,
        since,
        statistics
      )
    )
    return this
  }

  lessThan (value: string, since?: string, statistics?: Statistics): FilterBuilder {
    this.addToList(
      new FilterExpression(this.resourceName, Operators.LessThan, value, since, statistics)
    )
    return this
  }

  lessThanOrEqualTo (value: string, since?: string, statistics?: Statistics): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.resourceName,
        Operators.LessThanEqualTo,
        value,
        since,
        statistics
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

  load (filters: Filters): FilterBuilder {
    this.filterValidator.validate(filters)
    filters.and?.forEach(filter => {
      this.and().addToList(
        new FilterExpression(
          filter.resource,
          (Operators as any)[filter.op],
          filter.value ?? null,
          filter.since ?? null,
          (Statistics as any)[filter.statistics] ?? null
        )
      )
    })
    filters.or?.forEach(filter => {
      this.or().addToList(
        new FilterExpression(
          filter.resource,
          (Operators as any)[filter.op],
          filter.value ?? null,
          filter.since ?? null,
          (Statistics as any)[filter.statistics] ?? null
        )
      )
    })

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
