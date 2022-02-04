import moment from 'moment'

export class CustodianError extends Error {
  private readonly outputDirectory?: string
  private readonly dateTime: string

  constructor (message?: string, outputDirectory?: string) {
    super(message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustodianError)
    }

    this.outputDirectory = outputDirectory
    this.dateTime = moment().format('dddd, MMMM Do YYYY, h:mm:ss A Z')
  }

  getOutputDirectory (): string | undefined {
    return this.outputDirectory
  }

  getDateTime (): string {
    return this.dateTime
  }
}
