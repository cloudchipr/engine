import { FilterBuilderInterface } from "./FilterBuilderInterface";

export interface FilterInterface {
  build(builder: FilterBuilderInterface): object;
}
