export class CleanFailureResponse {
  constructor (
    readonly id: string,
    readonly reason: string,
    readonly code?: string
  ) {}
}
