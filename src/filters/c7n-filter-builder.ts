import { FIlterBuilderInterface } from '../fIlter-builder-interface'
import { FilterList } from './filter-list'
import { FilterExpression } from './filter-expression'
import { Operators } from './operators'

export class C7nFilterBuilder implements FIlterBuilderInterface {
  validate (expression: FilterExpression): boolean {
    return expression !== undefined || true
  }

  buildFilter (filterList: FilterList): object {
    const filterResponse: any = {}

    for (const filter of filterList.andList) {
      if (!Object.prototype.hasOwnProperty.call(filterResponse, 'and')) {
        filterResponse.and = []
      }

      filterResponse.and.push(filter.build(this))
    }

    for (const filter of filterList.orList) {
      if (!Object.prototype.hasOwnProperty.call(filterResponse, 'or')) {
        filterResponse.or = []
      }

      filterResponse.or.push(filter.build(this))
    }

    return filterResponse
  }

  buildFilterExpression (expression: FilterExpression): object {
    if (expression.operator === Operators.IsEmpty) {
      return {
        [expression.resource]: []
      }
    }

    switch (expression.resource) {
      case 'volume-age':
        return C7nFilterBuilder.buildVolumeAge(expression)
      case 'cpu':
        return C7nFilterBuilder.buildCpu(expression)
      case 'network-in':
        return C7nFilterBuilder.buildNetworkIn(expression)
      case 'network-out':
        return C7nFilterBuilder.buildNetworkOut(expression)
      case 'launch-time':
        return C7nFilterBuilder.buildLaunchTime(expression)
      default:
        return {
          key: expression.resource,
          op: expression.operator,
          value: expression.value
        }
    }
  }

  private static buildVolumeAge (expression: FilterExpression): object {
    return {
      type: 'value',
      key: 'CreateTime',
      op: expression.operator,
      value_type: 'age',
      value: expression.value
    }
  }

  private static buildCpu (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'CPUUtilization',
      statistics: 'Average',
      period: expression.since,
      op: expression.operator,
      value: expression.value
    }
  }

  private static buildNetworkIn (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'NetworkIn',
      statistics: 'Average',
      period: expression.since,
      op: expression.operator,
      value: expression.value
    }
  }

  private static buildNetworkOut (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'NetworkIn',
      statistics: 'Average',
      period: expression.since,
      op: expression.operator,
      value: expression.value
    }
  }

  private static buildLaunchTime (expression: FilterExpression): object {
    return {
      type: 'instance-age',
      op: expression.operator,
      days: expression.value
    }
  }
}
