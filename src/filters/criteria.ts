import { FilterInterface } from '@root/filter-Interface'
import { FilterList } from '@root/filters/filter-list'
import { FIlterBuilderInterface } from '@root/fIlter-builder-interface'

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
