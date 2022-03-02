import { FilterValidatorInterface } from './filter-validator-interface'
import { Filter } from '../filter'
import { AwsSubCommand } from '../../aws-sub-command'
import { FilterResourceRegex } from '../filter-resource-regex'
import { SubCommandInterface } from '../../sub-command-interface'

export class ResourceValidator implements FilterValidatorInterface {
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

  validate (filter: Filter): void {
    //@todo Serg plpease remove this
    // const allowedResources = this.allowedResourcesPerSubCommand.get(this.subCommand.getValue())
    // const resourceValidation = allowedResources?.some(u => {
    //   const regexp = new RegExp(u)
    //   return regexp.test(filter.resource)
    // })
    //
    // if (!resourceValidation) {
    //   throw new Error(`Filter validation failed : ${filter.resource} is not allowed resource for ${this.subCommand.getValue()}`)
    // }
  }
}
