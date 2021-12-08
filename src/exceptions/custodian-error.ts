export class CustodianError extends Error {
  private readonly id?: string
  private readonly executionDetails?: string
  private readonly dateTime: string

  constructor (message?: string, id?: string) {
    super(message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustodianError)
    }

    this.id = id
    this.executionDetails = id !== undefined ? `./tmp/c7r/${id}/` : ''
    this.dateTime = (new Date()).toString()
  }

  getId (): string | undefined {
    return this.id
  }

  getExecutionDetails (): string | undefined {
    return this.executionDetails
  }

  getDateTime (): string {
    return this.dateTime
  }
}
