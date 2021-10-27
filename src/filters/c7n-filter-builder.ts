import { FIlterBuilderInterface } from '../fIlter-builder-interface'
import { FilterList } from './filter-list'
import { FilterExpression } from './filter-expression'
import { Operators } from './operators'
import { SubCommandInterface } from '../sub-command-interface'
import { AwsSubCommand } from '../aws-sub-command'

export class C7nFilterBuilder implements FIlterBuilderInterface {
  private readonly subCommand: SubCommandInterface;

  constructor (subCommand: SubCommandInterface) {
    this.subCommand = subCommand
  }

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
    } else if (expression.operator === Operators.IsAbsent) {
      return C7nFilterBuilder.buildAbsent(expression)
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
        return this.buildLaunchTime(expression)
      case 'instance-ids':
        return C7nFilterBuilder.buildInstanceId(expression)
      case 'dns-name':
        return C7nFilterBuilder.buildDnsName(expression)
      case 'database-connections':
        return C7nFilterBuilder.buildDatabaseConnections(expression)
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

  private buildLaunchTime (expression: FilterExpression): object {
    return this.subCommand.getValue() === AwsSubCommand.RDS_SUBCOMMAND
      ? {
          type: 'value',
          value_type: 'age',
          key: 'InstanceCreateTime',
          value: expression.value,
          op: expression.operator
        }
      : {
          type: 'instance-age',
          op: expression.operator,
          days: expression.value
        }
  }

  private static buildInstanceId (expression: FilterExpression): object {
    return {
      type: 'value',
      key: 'InstanceId',
      op: expression.operator,
      value: expression.value
    }
  }

  private static buildDnsName (expression: FilterExpression): object {
    return {
      type: 'value',
      key: 'DNSName',
      op: expression.operator,
      value: expression.value
    }
  }

  private static buildAbsent (expression: FilterExpression): object {
    return {
      type: 'value',
      key: expression.resource,
      value: 'absent'
    }
  }

  private static buildDatabaseConnections (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'DatabaseConnections',
      days: expression.since,
      value: expression.value,
      op: expression.operator
    }
  }
}
