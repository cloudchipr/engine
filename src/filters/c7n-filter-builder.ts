import { FilterBuilderInterface } from '../filter-builder-interface'
import { FilterList } from './filter-list'
import { FilterExpression } from './filter-expression'
import { getOppositeOperator, Operators } from './operators'
import { SubCommandInterface } from '../sub-command-interface'
import { AwsSubCommand } from '../aws-sub-command'
import { StringHelper } from '../helpers/string-hepler'
import { getGcpStatistics, Statistics } from '../domain/statistics'
import { Command } from '../command'
import { GcpSubCommand } from '../adapters/gcp/gcp-sub-command'
import moment from 'moment'
import { FilterResourceRegex } from './filter-resource-regex'
import { FilterResource } from './filter-resource'

export class C7nFilterBuilder implements FilterBuilderInterface {
  private readonly command: Command
  private readonly subCommand: SubCommandInterface

  constructor (command: Command, subCommand: SubCommandInterface) {
    this.command = command
    this.subCommand = subCommand
  }

  validate (expression: FilterExpression): boolean {
    return expression !== undefined || true
  }

  buildFilter (filterList: FilterList): object {
    const filterResponse: any = {}
    // Nasty Hack to get Statistics Object in case metrics are not provided for CPU, NetIn, NetOut and DatabaseConnections
    // skip for clean commands
    if (!this.command.isClean()) {
      this.pushDefaultMetricFilterExpressions(filterList)
    }

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
      return this.buildEmpty(expression)
    } else if (expression.operator === Operators.IsNotEmpty) {
      return this.buildNotEmpty(expression)
    } else if (expression.operator === Operators.IsAbsent) {
      return this.buildAbsent(expression)
    } else if (expression.operator === Operators.IsNotAbsent) {
      return this.buildNotAbsent(expression)
    }

    if ((new RegExp(FilterResourceRegex.TAG)).test(expression.resource)) {
      return C7nFilterBuilder.buildTag(expression)
    }
    if ((new RegExp(FilterResourceRegex.LABEL)).test(expression.resource)) {
      return this.buildLabel(expression)
    }

    switch (expression.resource) {
      case FilterResource.VOLUME_AGE:
        return C7nFilterBuilder.buildVolumeAge(expression)
      case FilterResource.CPU:
        return this.buildCpu(expression)
      case FilterResource.NETWORK_IN:
        return this.buildNetworkIn(expression)
      case FilterResource.NETWORK_OUT:
        return this.buildNetworkOut(expression)
      case FilterResource.LAUNCH_TIME:
        return this.buildLaunchTime(expression)
      case FilterResource.INSTANCE_IDS:
        return C7nFilterBuilder.buildInstanceIds(expression)
      case FilterResource.ASSOCIATION_IDS:
        return C7nFilterBuilder.buildAssociationId(expression)
      case FilterResource.DNS_NAME:
        return C7nFilterBuilder.buildDnsName(expression)
      case FilterResource.DATABASE_CONNECTIONS:
        return this.buildDatabaseConnections(expression)
      case FilterResource.VOLUME_ID:
        return C7nFilterBuilder.buildVolumeId(expression)
      case FilterResource.INSTANCE_ID:
        return C7nFilterBuilder.buildInstanceId(expression)
      case FilterResource.DB_INSTANCE_IDENTIFIER:
        return C7nFilterBuilder.buildDBInstanceIdentifier(expression)
      case FilterResource.PUBLIC_IP:
        return C7nFilterBuilder.buildPublicIP(expression)
      case FilterResource.LOAD_BALANCER_NAME:
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

  private buildCpu (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return {
          type: 'metrics',
          name: 'compute.googleapis.com/instance/cpu/utilization',
          aligner: getGcpStatistics(expression.statistics as string),
          days: Number(expression.since),
          op: expression.operator,
          value: Number(expression.value)
        }
      default:
        return {
          type: 'metrics',
          name: 'CPUUtilization',
          statistics: expression.statistics,
          days: Number(expression.since),
          op: expression.operator,
          value: Number(expression.value)
        }
    }
  }

  private buildNetworkIn (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return {
          type: 'metrics',
          name: 'compute.googleapis.com/instance/network/received_bytes_count',
          aligner: getGcpStatistics(expression.statistics as string),
          days: Number(expression.since),
          op: expression.operator,
          value: Number(expression.value)
        }
      default:
        return {
          type: 'metrics',
          name: 'NetworkIn',
          statistics: expression.statistics,
          days: Number(expression.since),
          op: expression.operator,
          value: Number(expression.value)
        }
    }
  }

  private buildNetworkOut (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return {
          type: 'metrics',
          name: 'compute.googleapis.com/instance/network/sent_bytes_count',
          aligner: getGcpStatistics(expression.statistics as string),
          days: Number(expression.since),
          op: expression.operator,
          value: Number(expression.value)
        }
      default:
        return {
          type: 'metrics',
          name: 'NetworkOut',
          statistics: expression.statistics,
          days: Number(expression.since),
          op: expression.operator,
          value: Number(expression.value)
        }
    }
  }

  private buildLaunchTime (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.VM_SUBCOMMAND:
      case GcpSubCommand.DISKS_SUBCOMMAND:
        return {
          type: 'value',
          key: 'creationTimestamp',
          value: moment().subtract(Number(expression.value), 'd').format(),
          op: getOppositeOperator(expression.operator)
        }
      case GcpSubCommand.SQL_SUBCOMMAND:
        return {
          type: 'value',
          key: 'createTime',
          value: moment().subtract(Number(expression.value), 'd').format(),
          op: getOppositeOperator(expression.operator)
        }
      case AwsSubCommand.RDS_SUBCOMMAND:
        return {
          type: 'value',
          value_type: 'age',
          key: 'InstanceCreateTime',
          value: Number(expression.value),
          op: expression.operator
        }
      default:
        return {
          type: 'instance-age',
          op: expression.operator,
          days: Number(expression.value)
        }
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

  private buildAbsent (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.EIP_SUBCOMMAND:
        return {
          type: 'value',
          key: 'users',
          value: 0,
          value_type: 'size',
          op: Operators.Equal
        }
      default:
        return {
          type: 'value',
          key: C7nFilterBuilder.mapResourceName(expression.resource),
          value: 'absent'
        }
    }
  }

  private buildEmpty (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.DISKS_SUBCOMMAND:
        return {
          type: 'value',
          key: 'users',
          value: 0,
          value_type: 'size',
          op: Operators.Equal
        }
      default:
        return {
          [StringHelper.capitalizeFirstLetter(expression.resource)]: []
        }
    }
  }

  private buildNotEmpty (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.DISKS_SUBCOMMAND:
        return {
          type: 'value',
          key: 'users',
          value: 0,
          value_type: 'size',
          op: Operators.GreaterThan
        }
      default:
        return {
          not: [
            {
              [StringHelper.capitalizeFirstLetter(expression.resource)]: []
            }
          ]
        }
    }
  }

  private buildNotAbsent (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.EIP_SUBCOMMAND:
        return {
          type: 'value',
          key: 'users',
          value: 0,
          value_type: 'size',
          op: Operators.GreaterThan
        }
      default:
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
  }

  private buildDatabaseConnections (expression: FilterExpression): object {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.SQL_SUBCOMMAND:
        return {
          type: 'metrics',
          name: 'cloudsql.googleapis.com/database/network/connections',
          aligner: getGcpStatistics(expression.statistics as string),
          days: Number(expression.since),
          op: expression.operator,
          value: Number(expression.value)
        }
      default:
        return {
          type: 'metrics',
          name: 'DatabaseConnections',
          statistics: expression.statistics,
          days: Number(expression.since),
          value: Number(expression.value),
          op: expression.operator
        }
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
      case FilterResource.INSTANCE_IDS:
        return 'InstanceId'
      case FilterResource.ASSOCIATION_IDS:
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

  private buildLabel (expression: FilterExpression): object {
    const key = this.mapLabelKey(expression.resource)
    switch (expression.operator) {
      case Operators.Exists:
        return {
          type: 'value',
          key: key,
          value: 0,
          value_type: 'size',
          op: Operators.GreaterThan
        }
      case Operators.Contains:
        return {
          type: 'value',
          key: key,
          op: 'regex',
          value: `(.*${expression.value}.*)`
        }
      default:
        return {
          type: 'value',
          key: key,
          value: expression.value,
          op: expression.operator
        }
    }
  }

  private mapLabelKey (key: string): string {
    switch (this.subCommand.getValue()) {
      case GcpSubCommand.SQL_SUBCOMMAND:
        return key.replace('label:', 'settings.userLabels.')
      default:
        return key.replace('label:', 'labels.')
    }
  }

  private pushDefaultMetricFilterExpressions (filterList: FilterList) {
    if ([AwsSubCommand.EC2_SUBCOMMAND, GcpSubCommand.VM_SUBCOMMAND].includes(this.subCommand.getValue())) {
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
        C7nFilterBuilder.pushDefaultFilterExpression('cpu', filterList)
      }

      if (!isNetworkInFilterProvided) {
        C7nFilterBuilder.pushDefaultFilterExpression('network-in', filterList)
      }

      if (!isNetworkOutFilterProvided) {
        C7nFilterBuilder.pushDefaultFilterExpression('network-out', filterList)
      }
    }
    if ([AwsSubCommand.RDS_SUBCOMMAND, GcpSubCommand.SQL_SUBCOMMAND].includes(this.subCommand.getValue())) {
      const isDatabaseConnectionsFilterProvided = filterList.andList.some(filter => {
        return (filter instanceof FilterExpression && filter.resource === 'database-connections')
      })

      if (!isDatabaseConnectionsFilterProvided) {
        C7nFilterBuilder.pushDefaultFilterExpression('database-connections', filterList)
      }
    }
  }

  private static pushDefaultFilterExpression (resource: string, filterList: FilterList) {
    filterList.andList.push(
      new FilterExpression(
        resource,
        Operators.GreaterThanEqualTo,
        '0',
        '1',
        Statistics.Maximum
      )
    )
  }
}
