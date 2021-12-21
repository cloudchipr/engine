import { FilterBuilderInterface } from '../filter-builder-interface'
import { FilterList } from './filter-list'
import { FilterExpression } from './filter-expression'
import { Operators } from './operators'
import { SubCommandInterface } from '../sub-command-interface'
import { AwsSubCommand } from '../aws-sub-command'
import { StringHelper } from '../helpers/string-hepler'
import { Statistics } from '../domain/statistics'

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

    // Starting a nasty Hack to get Statistics Object in case metrics are not provided for CPU, NetIn, NetOut and DatabaseConnections
    if (this.subCommand.getValue() === AwsSubCommand.EC2_SUBCOMMAND) {
      const isCPUFilterProvided = filterList.andList.some(filter => {
        return (filter instanceof FilterExpression && filter.resource === 'cpu')
      })
      const isNetworkInFilterProvided = filterList.andList.some(filter => {
        return (filter instanceof FilterExpression && filter.resource === 'network-in')
      })
      const isNetworkOutFilterProvided = filterList.andList.some(filter => {
        return (filter instanceof FilterExpression && filter.resource === 'network-out')
      })

      if (!isCPUFilterProvided) {
        filterList.andList.push(
          new FilterExpression(
            'cpu',
            Operators.GreaterThanEqualTo,
            '0',
            '1',
            Statistics.Maximum
          )
        )
      }

      if (!isNetworkInFilterProvided) {
        filterList.andList.push(
          new FilterExpression(
            'network-in',
            Operators.GreaterThanEqualTo,
            '0',
            '1',
            Statistics.Maximum
          )
        )
      }

      if (!isNetworkOutFilterProvided) {
        filterList.andList.push(
          new FilterExpression(
            'network-out',
            Operators.GreaterThanEqualTo,
            '0',
            '1',
            Statistics.Maximum
          )
        )
      }
    }
    if (this.subCommand.getValue() === AwsSubCommand.RDS_SUBCOMMAND) {
      const isDatabaseConnectionsFilterProvided = filterList.andList.some(filter => {
        return (filter instanceof FilterExpression && filter.resource === 'database-connections')
      })

      if (!isDatabaseConnectionsFilterProvided) {
        filterList.andList.push(
          new FilterExpression(
            'database-connections',
            Operators.GreaterThanEqualTo,
            '0',
            '1',
            Statistics.Maximum
          )
        )
      }
    }
    // End of nasty hack

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
    } else if (expression.operator === Operators.IsNotEmpty) {
      return C7nFilterBuilder.buildNotEmpty(expression)
    } else if (expression.operator === Operators.IsAbsent) {
      return C7nFilterBuilder.buildAbsent(expression)
    } else if (expression.operator === Operators.IsNotAbsent) {
      return C7nFilterBuilder.buildNotAbsent(expression)
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
        return C7nFilterBuilder.buildInstanceIds(expression)
      case 'association-ids':
        return C7nFilterBuilder.buildAssociationId(expression)
      case 'dns-name':
        return C7nFilterBuilder.buildDnsName(expression)
      case 'database-connections':
        return C7nFilterBuilder.buildDatabaseConnections(expression)
      case 'volume-id':
        return C7nFilterBuilder.buildVolumeId(expression)
      case 'instance-id':
        return C7nFilterBuilder.buildInstanceId(expression)
      case 'db-instance-identifier':
        return C7nFilterBuilder.buildDBInstanceIdentifier(expression)
      case 'public-ip':
        return C7nFilterBuilder.buildPublicIP(expression)
      case 'load-balancer-name':
        return C7nFilterBuilder.buildLoadBalancerName(expression)
      default:
        throw new Error(`${expression.resource} - ${expression.operator} is not allowed for ${this.subCommand.getValue()}`)
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
      statistics: expression.statistics,
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
      statistics: expression.statistics,
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
      statistics: expression.statistics,
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

  private static buildInstanceIds (expression: FilterExpression): object {
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

  private static buildNotEmpty (expression: FilterExpression): object {
    return {
      not: [
        {
          [StringHelper.capitalizeFirstLetter(expression.resource)]: []
        }
      ]
    }
  }

  private static buildNotAbsent (expression: FilterExpression): object {
    return {
      not: [
        {
          type: 'value',
          key: C7nFilterBuilder.mapResourceName(expression.resource),
          value: 'absent'
        }
      ]
    }
  }

  private static buildDatabaseConnections (expression: FilterExpression): object {
    return {
      type: 'metrics',
      name: 'DatabaseConnections',
      statistics: expression.statistics,
      days: Number(expression.since),
      value: Number(expression.value),
      op: expression.operator
    }
  }

  private static buildVolumeId (expression: FilterExpression): object {
    return {
      VolumeId: expression.value
    }
  }

  private static buildInstanceId (expression: FilterExpression): object {
    return {
      InstanceId: expression.value
    }
  }

  private static buildDBInstanceIdentifier (expression: FilterExpression): object {
    return {
      DBInstanceIdentifier: expression.value
    }
  }

  private static buildPublicIP (expression: FilterExpression): object {
    return {
      PublicIp: expression.value
    }
  }

  private static buildLoadBalancerName (expression: FilterExpression): object {
    return {
      LoadBalancerName: expression.value
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
    switch (expression.operator) {
      case Operators.Exists:
        return {
          [expression.resource]: 'present'
        }
      case Operators.Contains:
        return {
          type: 'value',
          key: expression.resource,
          op: 'regex',
          value: `(.*${expression.value}.*)`
        }
      default:
        return {
          type: 'value',
          key: expression.resource,
          value: expression.value
        }
    }
  }
}
