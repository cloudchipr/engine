import { FilterInterface } from "./FilterInterface";

export class Parameter {
  private _force: boolean = false;
  private _filters: FilterInterface[] = [];

  set force(force: boolean) {
    this._force = force;
  }

  isForce(): boolean {
    return this._force;
  }

  get filters() {
    return this._filters;
  }

  addFilter(filter: FilterInterface): Parameter {
    this._filters.push(filter);
    return this;
  }

  orFilter(filter: FilterInterface): Parameter {
    this._filters.push(filter);
    return this;
  }
}
