import { FilterList } from "./FilterList";
import { FilterExpression } from "./FilterExpression";
import { Operators } from "./Operators";
import { FilterBuilderInterface } from "../FilterBuilderInterface";

export class FilterBuilder {
  private readonly filters: FilterList;
  private readonly builder: FilterBuilderInterface;
  private connector: string = "and";
  private resourceName: string = "";

  constructor(builder: FilterBuilderInterface) {
    this.filters = new FilterList(builder);
    this.builder = builder;
  }

  resource(resource: string): FilterBuilder {
    this.resourceName = resource;
    return this;
  }

  isEmpty(): FilterBuilder {
    this.addToList(
      new FilterExpression(this.builder, this.resourceName, Operators.IsEmpty)
    );
    return this;
  }

  equal(value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.builder,
        this.resourceName,
        Operators.Equal,
        value,
        since
      )
    );
    return this;
  }

  greaterThan(value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.builder,
        this.resourceName,
        Operators.GreaterThan,
        value,
        since
      )
    );
    return this;
  }

  greaterThanOrEqualTo(value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.builder,
        this.resourceName,
        Operators.GreaterThanEqualTo,
        value,
        since
      )
    );
    return this;
  }

  lessThan(value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.builder,
        this.resourceName,
        Operators.LessThan,
        value,
        since
      )
    );
    return this;
  }

  lessThanOrEqualTo(value: string, since?: string): FilterBuilder {
    this.addToList(
      new FilterExpression(
        this.builder,
        this.resourceName,
        Operators.LessThanEqualTo,
        value,
        since
      )
    );
    return this;
  }

  and(): FilterBuilder {
    this.connector = "and";
    return this;
  }

  or(): FilterBuilder {
    this.connector = "or";
    return this;
  }

  toList(): FilterList {
    return this.filters;
  }

  private addToList(filter: FilterExpression | FilterList): void {
    if (this.connector === "and") {
      this.filters.and(filter);
    } else {
      this.filters.or(filter);
    }
  }
}
