import { FilterBuilderInterface } from '../filter-builder-interface'
import { FilterList } from './filter-list'
import { FilterExpression } from './filter-expression'
import { Operators } from './operators'
import { SubCommandInterface } from '../sub-command-interface'
import { AwsSubCommand } from '../aws-sub-command'
import { StringHelper } from '../helpers/string-hepler'

export class C7nFilterBuilder implements FilterBuilderInterface {
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
      return C7nFilterBuilder.buildEmpty(expression)
    } else if (expression.operator === Operators.IsAbsent) {
      return C7nFilterBuilder.buildAbsent(expression)
    }

    if (/^tag:.{1,128}$/.test(expression.resource)) {
      return C7nFilterBuilder.buildTag(expression)
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
      case 'association-ids':
        return C7nFilterBuilder.buildAssociationId(expression)
      case 'dns-name':
        return C7nFilterBuilder.buildDnsName(expression)
      case 'database-connections':
        return C7nFilterBuilder.buildDatabaseConnections(expression)
      default:
        return {
          key: expression.resource,
          op: expression.operator,
          value: Number(expression.value)
        }
    }
  }

  private static buildVolumeAge (expression: FilterExpression): object {
    return {
      type: 'value',
      key: 'CreateTime',
      op: expression.operator,
      value_type: 'age',
      value: Number(expression.value)
    }
  }

  private static buildCpu (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'CPUUtilization',
      statistics: 'Average',
      period: 86400,
      days: Number(expression.since),
      op: expression.operator,
      value: Number(expression.value)
    }
  }

  private static buildNetworkIn (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'NetworkIn',
      statistics: 'Average',
      period: 86400,
      days: Number(expression.since),
      op: expression.operator,
      value: Number(expression.value)
    }
  }

  private static buildNetworkOut (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'NetworkOut',
      statistics: 'Average',
      period: 86400,
      days: Number(expression.since),
      op: expression.operator,
      value: Number(expression.value)
    }
  }

  private buildLaunchTime (expression: FilterExpression): object {
    return this.subCommand.getValue() === AwsSubCommand.RDS_SUBCOMMAND
      ? {
          type: 'value',
          value_type: 'age',
          key: 'InstanceCreateTime',
          value: Number(expression.value),
          op: expression.operator
        }
      : {
          type: 'instance-age',
          op: expression.operator,
          days: Number(expression.value)
        }
  }

  private static buildInstanceId (expression: FilterExpression): object {
    return {
      type: 'value',
      key: 'InstanceId',
      op: expression.operator,
      value: Number(expression.value)
    }
  }

  private static buildAssociationId (expression: FilterExpression): object {
    return {
      type: 'value',
      key: 'AssociationId',
      op: expression.operator,
      value: Number(expression.value)
    }
  }

  private static buildDnsName (expression: FilterExpression): object {
    return {
      type: 'value',
      key: 'DNSName',
      op: expression.operator,
      value: Number(expression.value)
    }
  }

  private static buildAbsent (expression: FilterExpression): object {
    return {
      type: 'value',
      key: this.mapResourceName(expression.resource),
      value: 'absent'
    }
  }

  private static buildEmpty (expression: FilterExpression): object {
    return {
      [StringHelper.capitalizeFirstLetter(expression.resource)]: []
    }
  }

  private static buildDatabaseConnections (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'DatabaseConnections',
      days: Number(expression.since),
      value: Number(expression.value),
      op: expression.operator
    }
  }

  private static mapResourceName (name: string): string {
    switch (name) {
      case 'instance-ids':
        return 'InstanceId'
      case 'association-ids':
        return 'AssociationId'
      default:
        return StringHelper.capitalizeFirstLetter(name)
    }
  }

  private static buildTag (expression: FilterExpression): object {
    return expression.operator === Operators.Exists
      ? {
          [expression.resource]: 'present'
        }
      : {
          type: 'value',
          key: expression.resource,
          value: expression.value
        }
  }
}
