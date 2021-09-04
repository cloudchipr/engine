import { Operators } from "./Operators";
import { FilterInterface } from "../FilterInterface";
import { FilterBuilderInterface } from "../FilterBuilderInterface";

export class FilterExpression implements FilterInterface {
  public builder: FilterBuilderInterface;
  public resource: string;
  public operator: Operators | undefined;
  public value?: string;
  public since?: string;

  constructor(
    builder: FilterBuilderInterface,
    field: string,
    operator: Operators,
    value?: string,
    since?: string
  ) {
    this.builder = builder;
    this.resource = field;
    this.operator = operator as Operators;
    this.value = value;
    this.since = since;
  }

  public build(): object {
    return this.builder.buildFilterExpression(this);
  }
}
