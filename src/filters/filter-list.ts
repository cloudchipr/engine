import { FilterExpression } from './filter-expression'
import { FilterInterface } from '../filter-interface'
import { FilterBuilderInterface } from '../filter-builder-interface'

export class FilterList implements FilterInterface {
  private _andList: (FilterExpression | FilterList)[] = [];
  private _orList: (FilterExpression | FilterList)[] = [];

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

  public isEmpty (): boolean {
    return this._andList.length === 0 && this._orList.length === 0
  }

  public getFilterExpressionByResource (resource: string): FilterExpression | undefined {
    for (const filter of this._andList) {
      if (filter instanceof FilterExpression && filter.resource === resource) {
        return filter
      }
    }
    for (const filter of this._orList) {
      if (filter instanceof FilterExpression && filter.resource === resource) {
        return filter
      }
    }
    return undefined
  }

  public replaceFilterExpressionByResource (resource: string, newFilterExpression: FilterExpression): void {
    this._andList = this._andList.map((filter) => {
      if (filter instanceof FilterExpression && filter.resource === resource) {
        return newFilterExpression
      }
      return filter
    })
    this._orList = this._orList.map((filter) => {
      if (filter instanceof FilterExpression && filter.resource === resource) {
        return newFilterExpression
      }
      return filter
    })
  }
}
