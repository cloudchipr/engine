import { AWSFilter } from './filters/AWSFilter';

export class AWSFilterBuilder {
  private readonly filter: AWSFilter;

  constructor() {
    this.filter = new AWSFilter();
  }

  unattached(unattached: boolean): AWSFilterBuilder {
    this.filter.unattached = unattached;
    return this;
  }

  volumeAge(volumeAge: string): AWSFilterBuilder {
    this.filter.volumeAge = volumeAge;
    return this;
  }
}