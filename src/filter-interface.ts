import { FilterBuilderInterface } from './filter-builder-interface'
import { FilterExpression } from './filters/filter-expression'

export interface FilterInterface {
  build(builder: FilterBuilderInterface): object
  isEmpty(): boolean
  getFilterExpressionByResource (resource: string): FilterExpression | undefined
  replaceFilterExpressionByResource (resource: string, newFilterExpression: FilterExpression): void
}
