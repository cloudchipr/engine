import { FilterInterface } from "../FilterInterface";
import { FilterList } from "./FilterList";
import { FilterBuilderInterface } from "../FilterBuilderInterface";

export class Criteria implements FilterInterface {
  public filters: FilterList;

  constructor(builder: FilterBuilderInterface) {
    this.filters = new FilterList(builder);
  }

  public and(filter: Criteria): void {
    this.filters.and(filter.filters);
  }

  public or(filter: Criteria): void {
    this.filters.or(filter.filters);
  }

  public build(): object {
    return this.filters.build();
  }
}
