import { Configuration } from './Configuration';
import { Command } from './Command';
import { SubCommandInterface } from './SubCommandInterface';
import { Parameter } from './Parameter';

export class EngineRequest {
  constructor(
    private readonly _configuration: Configuration,
    private readonly _command: Command,
    private readonly _subCommand: SubCommandInterface,
    private readonly _parameter: Parameter
  ) {}

  get configuration(): Configuration {
    return this._configuration;
  }

  get command(): Command {
    return this._command
  }

  get subCommand(): SubCommandInterface {
    return this._subCommand
  }

  get parameter(): Parameter {
    return this._parameter
  }
}