import { FilterBuilderInterface } from './filter-builder-interface'

export interface FilterInterface {
  build(builder: FilterBuilderInterface): object;
}
