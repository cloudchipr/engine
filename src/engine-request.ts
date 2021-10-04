import { Configuration } from '@root/configuration'
import { Command } from '@root/command'
import { SubCommandInterface } from '@root/sub-command-interface'
import { Parameter } from '@root/parameter'

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
