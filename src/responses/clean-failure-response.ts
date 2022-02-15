export class CleanFailureResponse {
  constructor (
    private readonly _id: string,
    private readonly _reason: string
  ) {}

  get id (): string {
    return this._id
  }

  get reason (): string {
    return this._reason
  }
}
