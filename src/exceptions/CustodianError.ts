import winston, { transports } from 'winston'

export class CustodianError extends Error {
  private readonly dir?: string

  constructor (message?: string, dir?: string, isDebugMode: boolean = false) {
    super(message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustodianError)
    }

    this.dir = dir

    if (isDebugMode && dir !== undefined) {
      winston.createLogger({
        level: 'error',
        defaultMeta: { service: 'cloudchipr-engine' }
      }).clear().add(new transports.File({
        filename: `${dir}error.log`,
        format: winston.format.prettyPrint()
      })).error('Failed on executing custodian:', this)
    }
  }
}
