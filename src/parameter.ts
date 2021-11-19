import { FilterInterface } from './filter-interface'

export class Parameter {
  private readonly _force: boolean;
  private readonly _filter: FilterInterface;
  private readonly _regions: string[];

  constructor (filter: FilterInterface, force: boolean, regions: string[]) {
    this._force = force
    this._filter = filter
    this._regions = regions
  }

  get force (): boolean {
    return this._force
  }

  get filter (): FilterInterface {
    return this._filter
  }

  get regions (): string[] {
    return this._regions
  }
}
