import { SubCommandInterface } from '../sub-command-interface'
import { CleanFailureResponse } from './clean-failure-response'

export class CleanResponse {
  constructor (
    private readonly _subCommand: SubCommandInterface,
    private _success: string[] = [],
    private _failure: CleanFailureResponse[] = []
  ) {}

  get subCommand (): SubCommandInterface {
    return this._subCommand
  }

  get success (): string[] {
    return this._success
  }

  set success (success: string[]) {
    this._success = success
  }

  addSuccess (success: string): void {
    this._success.push(success)
  }

  get failure (): CleanFailureResponse[] {
    return this._failure
  }

  set failure (failure: CleanFailureResponse[]) {
    this._failure = failure
  }

  addFailure (failure: CleanFailureResponse): void {
    this._failure.push(failure)
  }
}
