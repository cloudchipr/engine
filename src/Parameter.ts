import { FilterInterface } from "./FilterInterface";

export class Parameter {
  private readonly force: boolean;
  private readonly filter: FilterInterface;

  constructor(filter: FilterInterface, force: boolean) {
    this.force = force;
    this.filter = filter;
  }
}
