import { FilterInterface } from './filter-Interface'

export class Parameter {
  private readonly _force: boolean;
  private readonly _filter: FilterInterface;

  constructor (filter: FilterInterface, force: boolean) {
    this._force = force
    this._filter = filter
  }

  get force (): boolean {
    return this._force
  }

  get filter (): FilterInterface {
    return this._filter
  }
}
