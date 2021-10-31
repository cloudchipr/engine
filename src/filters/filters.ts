import { Filter } from './filter'

export class Filters {
    public and: Array<Filter>;
    public or: Array<Filter>;

    constructor (and: Array<Filter>, or: Array<Filter>) {
      this.and = and
      this.or = or
    }
}
