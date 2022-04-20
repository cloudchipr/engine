export class Response<Type> {
  readonly items: Type[];
  readonly errors: any[] = [];

  constructor (items: Type[]) {
    this.items = items
  }

  get count (): number {
    return this.items.length
  }

  addError (error: any): void {
    this.errors.push(error)
  }

  hasErrors (): boolean {
    return this.errors.length > 0
  }
}
