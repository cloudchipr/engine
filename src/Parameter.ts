import {FilterInterface } from './FilterInterface';
import { ANDFilter } from './filters/ANDFilter';

export class Parameter {
  private _force: boolean = false
  private _filters: FilterInterface[] = [new ANDFilter()];

  set force(force: boolean) {
    this._force = force;
  }

  isForce(): boolean {
    return this._force;
  }

  get filters() {
    return this._filters
  }

  addFilter(filter: FilterInterface):  Parameter {
    this._filters.push(filter)
    return this;
  }

  orFilter(filter: FilterInterface):  Parameter {
    this._filters.push(filter)
    return this;
  }
}