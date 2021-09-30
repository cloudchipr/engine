import { Configuration } from './configuration'
import { Command } from './command'
import { SubCommandInterface } from './sub-commandInterface'
import { Parameter } from './parameter'

export class EngineRequest {
  constructor (
    private readonly _configuration: Configuration,
    private readonly _command: Command,
    private readonly _subCommand: SubCommandInterface,
    private readonly _parameter: Parameter
  ) {}

  get configuration (): Configuration {
    return this._configuration
  }

  get command (): Command {
    return this._command
  }

  get subCommand (): SubCommandInterface {
    return this._subCommand
  }

  get parameter (): Parameter {
    return this._parameter
  }
}
