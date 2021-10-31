import { FilterExpression } from './filter-expression'
import { FilterInterface } from '../filter-Interface'
import { FilterBuilderInterface } from '../filter-builder-interface'

export class FilterList implements FilterInterface {
  private readonly _andList: (FilterExpression | FilterList)[] = [];
  private readonly _orList: (FilterExpression | FilterList)[] = [];

  public and (filter: FilterExpression | FilterList) {
    if (filter !== undefined && filter !== null) {
      this._andList.push(filter)
    }
  }

  public or (filter: FilterExpression | FilterList) {
    if (filter !== undefined && filter !== null) {
      this._orList.push(filter)
    }
  }

  get andList (): (FilterExpression | FilterList)[] {
    return this._andList
  }

  get orList (): (FilterExpression | FilterList)[] {
    return this._orList
  }

  public build (builder: FilterBuilderInterface): object {
    return builder.buildFilter(this)
  }
}
