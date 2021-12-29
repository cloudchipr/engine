interface FailureInterface {
  region: any,
  account: any
}

export class Response<Type> {
  readonly items: Type[];
  readonly failures: FailureInterface[];

  constructor (items: Type[], failures: FailureInterface[]) {
    this.items = items
    this.failures = failures
  }

  get count (): number {
    return this.items.length
  }
}
