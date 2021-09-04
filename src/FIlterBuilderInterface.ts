import { FilterExpression } from "./filters/FilterExpression";
import { FilterList } from "./filters/FilterList";

export interface FilterBuilderInterface {
  buildFilter(filter: FilterList): object;
  validate(expression: FilterExpression): boolean;
  buildFilterExpression(expression: FilterExpression): object;
}
