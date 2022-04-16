import { CleanFailureResponse } from './clean-failure-response'

export class CleanResponse {
  constructor (
    readonly subCommand: string,
    readonly success: string[] = [],
    readonly failure: CleanFailureResponse[] = [],
    public savings: number = 0
  ) {}

  addSuccess (success: string): void {
    this.success.push(success)
  }

  addFailure (failure: CleanFailureResponse): void {
    this.failure.push(failure)
  }
}
