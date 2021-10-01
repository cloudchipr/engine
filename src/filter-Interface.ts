import { FIlterBuilderInterface } from '@root/fIlter-builder-interface'

export interface FilterInterface {
  build(builder: FIlterBuilderInterface): object;
}
