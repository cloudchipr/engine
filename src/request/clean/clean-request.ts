import { SubCommandInterface } from '../../sub-command-interface'
import { CleanRequestInterface } from './interface/clean-request-interface'
import { CleanRequestResourceInterface } from './interface/clean-request-resource-interface'

export class CleanRequest implements CleanRequestInterface {
  constructor (
    private readonly _subCommand: SubCommandInterface,
    private readonly _resources: CleanRequestResourceInterface[]
  ) {}

  get subCommand (): SubCommandInterface {
    return this._subCommand
  }

  get resources (): CleanRequestResourceInterface[] {
    return this._resources
  }
}
