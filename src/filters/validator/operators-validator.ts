import { FilterValidatorInterface } from './filter-validator-interface'
import { Filter } from '../filter'
import { Operators } from '../operators'
import { FilterResourceRegex } from '../filter-resource-regex'
import { FilterResource } from '../filter-resource'

export class OperatorsValidator implements FilterValidatorInterface {
  private allowedOperatorsPerResource : Map<string, Set<string>> = new Map<string, Set<string>>([
    [FilterResource.ATTACHMENTS, new Set([Operators.IsEmpty, Operators.IsNotEmpty])],
    [FilterResource.VOLUME_AGE, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
    [FilterResource.LAUNCH_TIME, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
    [FilterResource.CPU, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
    [FilterResource.NETWORK_IN, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
    [FilterResource.NETWORK_OUT, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
    [FilterResource.INSTANCES, new Set([Operators.IsEmpty, Operators.IsNotEmpty])],
    [FilterResource.INSTANCE_IDS, new Set([Operators.IsAbsent, Operators.IsNotAbsent])],
    [FilterResource.ASSOCIATION_IDS, new Set([Operators.IsAbsent, Operators.IsNotAbsent])],
    [FilterResource.DATABASE_CONNECTIONS, new Set([Operators.Equal, Operators.GreaterThan, Operators.GreaterThanEqualTo, Operators.LessThan, Operators.LessThanEqualTo])],
    [FilterResource.TAG, new Set([Operators.Equal, Operators.Exists, Operators.Contains])],
    [FilterResource.VOLUME_ID, new Set([Operators.Equal])],
    [FilterResource.INSTANCE_ID, new Set([Operators.Equal])],
    [FilterResource.DB_INSTANCE_IDENTIFIER, new Set([Operators.Equal])],
    [FilterResource.PUBLIC_IP, new Set([Operators.Equal])],
    [FilterResource.LOAD_BALANCER_NAME, new Set([Operators.Equal])]
  ]
  )

  validate (filter: Filter): void {
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
  }
}
