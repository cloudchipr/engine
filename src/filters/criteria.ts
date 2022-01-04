import { FilterInterface } from '../filter-interface'
import { FilterList } from './filter-list'
import { FilterBuilderInterface } from '../filter-builder-interface'

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
}
