import { SubCommandInterface } from '../../../sub-command-interface'
import { CleanRequestResourceInterface } from './clean-request-resource-interface'

export interface CleanRequestInterface {
  get subCommand (): SubCommandInterface
  get resources (): CleanRequestResourceInterface[]
}
