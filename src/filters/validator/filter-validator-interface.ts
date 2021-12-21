import { Filter } from '../filter'

export interface FilterValidatorInterface {
  validate (filter: Filter): void
}
