export class Response<Type> {
  readonly items: Type[];

  constructor (items: Type[]) {
    this.items = items
  }

  get count (): number {
    return this.items.length
  }
}
