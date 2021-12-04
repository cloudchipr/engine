export class CustodianError extends Error {
  private readonly id?: string
  private readonly executionDetails?: string
  private readonly timestamp: number

  constructor (message?: string, id?: string) {
    super(message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustodianError)
    }

    this.id = id
    this.executionDetails = id !== undefined ? `./tmp/c7r/${id}/` : ''
    this.timestamp = Date.now()
  }

  getId (): string | undefined {
    return this.id
  }

  getExecutionDetails (): string | undefined {
    return this.executionDetails
  }

  getTimestamp (): number {
    return this.timestamp
  }
}
