import moment from 'moment'

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
    this.executionDetails = id !== undefined ? `./.c8r/run/${id}/` : ''
    this.dateTime = moment().format('dddd, MMMM Do YYYY, h:mm:ss A Z')
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
