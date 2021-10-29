import { FilterExpression } from './filters/filter-expression'
import { FilterList } from './filters/filter-list'

export interface FilterBuilderInterface {
  buildFilter(filter: FilterList): object;
  validate(expression: FilterExpression): boolean;
  buildFilterExpression(expression: FilterExpression): object;
}
