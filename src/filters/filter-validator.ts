import { Filters } from './filters'
import { Operators } from './operators'
import { SubCommandInterface } from '../sub-command-interface'
import { AwsSubCommand } from '../aws-sub-command'
import { FilterResourceRegex } from './filter-resource-regex'
import { FilterResource } from './filter-resource'

export class FilterValidator {
    private readonly subCommand: SubCommandInterface;

    constructor (subCommand: SubCommandInterface) {
      this.subCommand = subCommand
    }

    private allowedResourcesPerSubCommand : Map<string, Array<string>> = new Map<string, Array<string>>([
      [AwsSubCommand.EBS_SUBCOMMAND, [FilterResourceRegex.ATTACHMENTS, FilterResourceRegex.VOLUME_AGE, FilterResourceRegex.TAG, FilterResourceRegex.VOLUME_ID]],
      [AwsSubCommand.EC2_SUBCOMMAND, [FilterResourceRegex.LAUNCH_TIME, FilterResourceRegex.CPU, FilterResourceRegex.NETWORK_IN, FilterResourceRegex.NETWORK_OUT, FilterResourceRegex.INSTANCE_ID, FilterResourceRegex.TAG]],
      [AwsSubCommand.ELB_SUBCOMMAND, [FilterResourceRegex.INSTANCES, FilterResourceRegex.LOAD_BALANCER_NAME, FilterResourceRegex.TAG]],
      [AwsSubCommand.NLB_SUBCOMMAND, [FilterResourceRegex.INSTANCES, FilterResourceRegex.LOAD_BALANCER_NAME, FilterResourceRegex.TAG]],
      [AwsSubCommand.ALB_SUBCOMMAND, [FilterResourceRegex.INSTANCES, FilterResourceRegex.LOAD_BALANCER_NAME, FilterResourceRegex.TAG]],
      [AwsSubCommand.EIP_SUBCOMMAND, [FilterResourceRegex.INSTANCE_IDS, FilterResourceRegex.ASSOCIATION_IDS, FilterResourceRegex.PUBLIC_IP, FilterResourceRegex.TAG]],
      [AwsSubCommand.RDS_SUBCOMMAND, [FilterResourceRegex.LAUNCH_TIME, FilterResourceRegex.DATABASE_CONNECTIONS, FilterResourceRegex.DB_INSTANCE_IDENTIFIER, FilterResourceRegex.TAG]]
    ]
    )

    private allowedOperatorsPerResource : Map<string, Set<string>> = new Map<string, Set<string>>([
      [FilterResource.ATTACHMENTS, new Set([Operators.IsEmpty, Operators.IsNotEmpty])],
      [FilterResource.VOLUME_AGE, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
      [FilterResource.LAUNCH_TIME, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
      [FilterResource.CPU, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
      [FilterResource.NETWORK_IN, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
      [FilterResource.NETWORK_OUT, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
      [FilterResource.INSTANCES, new Set([Operators.IsEmpty, Operators.IsNotEmpty])],
      [FilterResource.INSTANCE_IDS, new Set([Operators.IsAbsent])],
      [FilterResource.ASSOCIATION_IDS, new Set([Operators.IsAbsent])],
      [FilterResource.DATABASE_CONNECTIONS, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
      [FilterResource.TAG, new Set([Operators.Equal, Operators.Exists, Operators.Contains])],
      [FilterResource.VOLUME_ID, new Set([Operators.Equal])],
      [FilterResource.INSTANCE_ID, new Set([Operators.Equal])],
      [FilterResource.DB_INSTANCE_IDENTIFIER, new Set([Operators.Equal])],
      [FilterResource.PUBLIC_IP, new Set([Operators.Equal])],
      [FilterResource.LOAD_BALANCER_NAME, new Set([Operators.Equal])]
    ]
    )

    public validate (filters: Filters) {
      if (!filters.and) {
        throw new Error('Filter validation failed : The root element must either be `and` or `or`')
      }

      filters.and.forEach(filter => {
        const allowedResources = this.allowedResourcesPerSubCommand.get(this.subCommand.getValue())
        const resourceValidation = allowedResources?.some(u => {
          const regexp = new RegExp(u)
          return regexp.test(filter.resource)
        })

        if (!resourceValidation) {
          throw new Error(`Filter validation failed : ${filter.resource} is not allowed resource for ${this.subCommand.getValue()}`)
        }

        if (typeof (Operators as any)[filter.op] === 'undefined') {
          throw new Error(`Filter validation failed : ${filter.op} is not allowed operator for ${filter.resource} resource`)
        }

        let resource = filter.resource

        if ((new RegExp(FilterResourceRegex.TAG)).test(resource)) {
          resource = FilterResource.TAG
        }

        const allowedOperators = this.allowedOperatorsPerResource.get(resource)
        const operatorValidation = allowedOperators?.has((Operators as any)[filter.op])

        if (!operatorValidation) {
          throw new Error(`Filter validation failed : ${filter.op} is not allowed operator for ${resource}`)
        }
      })
    }
}
