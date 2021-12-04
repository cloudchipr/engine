export class CustodianError extends Error {
  private readonly id?: string

  constructor (message?: string, id?: string) {
    super(message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustodianError)
    }

    this.id = id
  }

  getId (): string | undefined {
    return this.id
  }
}
