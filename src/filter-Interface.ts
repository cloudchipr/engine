import { FIlterBuilderInterface } from './fIlter-builder-interface'

export interface FilterInterface {
  build(builder: FIlterBuilderInterface): object;
}
