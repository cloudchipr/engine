import { Filters } from './filters'
import { SubCommandInterface } from '../sub-command-interface'
import { FilterValidatorInterface } from './validator/filter-validator-interface'
import { OperatorsValidator } from './validator/operators-validator'
import { ResourceValidator } from './validator/resource-validator'
import { StatisticsValidator } from './validator/statistics-validator'

export class FilterValidator {
    private readonly filterValidators: Array<FilterValidatorInterface>

    constructor (subCommand: SubCommandInterface) {
      this.filterValidators = [
        new ResourceValidator(subCommand),
        new StatisticsValidator(),
        new OperatorsValidator()
      ]
    }

    public validate (filters: Filters) {
      if ((!filters.and && !filters.or) || (filters.and && filters.or)) {
        throw new Error('Filter validation failed : There should be only one root, and it must either be `and` or `or`')
      }

      filters.and?.forEach(filter => {
        this.filterValidators.forEach(validator => {
          validator.validate(filter)
        })
      })

      filters.or?.forEach(filter => {
        this.filterValidators.forEach(validator => {
          validator.validate(filter)
        })
      })
    }
}
