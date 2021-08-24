import { GarbageItemInterface } from './garbage-item-interface';

export class FindGarbageDetailsResponse {
  readonly items: GarbageItemInterface[];

  constructor(items: GarbageItemInterface[]) {
    this.items = items;
  }
}
