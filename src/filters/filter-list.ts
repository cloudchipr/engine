import { FilterExpression } from '@root/filters/filter-expression'
import { FilterInterface } from '@root/filter-Interface'
import { FIlterBuilderInterface } from '@root/fIlter-builder-interface'

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

  public build (builder: FIlterBuilderInterface): object {
    return builder.buildFilter(this)
  }
}
