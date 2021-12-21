import { FilterValidatorInterface } from './filter-validator-interface'
import { Filter } from '../filter'
import { Statistics } from '../../domain/statistics'

export class StatisticsValidator implements FilterValidatorInterface {
  validate (filter: Filter): void {
    if (filter.statistics !== undefined && typeof (Statistics as any)[filter.statistics] === 'undefined') {
      throw new Error(`Filter validation failed : ${filter.statistics} is not allowed value for ${filter.resource} resource`)
    }
  }
}
