import { FilterInterface } from '../filter-interface'
import { FilterList } from './filter-list'
import { FilterBuilderInterface } from '../filter-builder-interface'
import { FilterExpression } from './filter-expression'

export class Criteria implements FilterInterface {
  public filters: FilterList;

  constructor () {
    this.filters = new FilterList()
  }

  public and (filter: Criteria): void {
    this.filters.and(filter.filters)
  }

  public or (filter: Criteria): void {
    this.filters.or(filter.filters)
  }

  public build (builder: FilterBuilderInterface): object {
    return this.filters.build(builder)
  }

  public isEmpty (): boolean {
    return this.filters.isEmpty()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getFilterExpressionByResource (resource: string): FilterExpression | undefined {
    return undefined
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public replaceFilterExpressionByResource (resource: string, newFilterExpression: FilterExpression): void {
    return undefined
  }
}
