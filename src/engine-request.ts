import { Command } from './command'
import { SubCommandInterface } from './sub-command-interface'
import { Parameter } from './parameter'

export class EngineRequest {
  constructor (
    private readonly _command: Command,
    private readonly _subCommand: SubCommandInterface,
    private readonly _parameter: Parameter,
    private readonly _isDebugMode: boolean,
    private readonly _outputDirectory: string = './'
  ) {}

  get command (): Command {
    return this._command
  }

  get subCommand (): SubCommandInterface {
    return this._subCommand
  }

  get parameter (): Parameter {
    return this._parameter
  }

  get isDebugMode (): boolean {
    return this._isDebugMode
  }

  get outputDirectory (): string {
    return this._outputDirectory
  }
}
