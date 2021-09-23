import { FilterInterface } from "../FilterInterface";
import { FilterList } from "./FilterList";
import { FilterBuilderInterface } from "../FilterBuilderInterface";

export class Criteria implements FilterInterface {
  public filters: FilterList;

  constructor() {
    this.filters = new FilterList();
  }

  public and(filter: Criteria): void {
    this.filters.and(filter.filters);
  }

  public or(filter: Criteria): void {
    this.filters.or(filter.filters);
  }

  public build(builder: FilterBuilderInterface): object {
    return this.filters.build(builder);
  }
}
