import { FilterInterface } from '../filter-Interface'
import { FilterList } from './filter-list'
import { FIlterBuilderInterface } from '../fIlter-builder-interface'

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

  public build (builder: FIlterBuilderInterface): object {
    return this.filters.build(builder)
  }
}
