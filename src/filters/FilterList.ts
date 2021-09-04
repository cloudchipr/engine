import { FilterExpression } from "./FilterExpression";
import { FilterInterface } from "../FilterInterface";
import { FilterBuilderInterface } from "../FilterBuilderInterface";

export class FilterList implements FilterInterface {
  private readonly builder: FilterBuilderInterface;
  private readonly _andList: (FilterExpression | FilterList)[] = [];
  private readonly _orList: (FilterExpression | FilterList)[] = [];

  constructor(builder: FilterBuilderInterface) {
    this.builder = builder;
  }

  public and(filter: FilterExpression | FilterList) {
    if (filter !== undefined && filter !== null && filter.build() !== {}) {
      this._andList.push(filter);
    }
  }

  public or(filter: FilterExpression | FilterList) {
    if (filter !== undefined && filter !== null && filter.build() !== {}) {
      this._orList.push(filter);
    }
  }

  get andList(): (FilterExpression | FilterList)[] {
    return this._andList;
  }

  get orList(): (FilterExpression | FilterList)[] {
    return this._orList;
  }

  public build(): object {
    return this.builder.buildFilter(this);
  }
}
