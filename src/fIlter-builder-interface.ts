import { FilterExpression } from '@root/filters/filter-expression'
import { FilterList } from '@root/filters/filter-list'

export interface FIlterBuilderInterface {
  buildFilter(filter: FilterList): object;
  validate(expression: FilterExpression): boolean;
  buildFilterExpression(expression: FilterExpression): object;
}
