import { Ebs } from '../domain/types/ebs';

export class DetachedVolumesResponse {
  readonly items: Ebs[];
  readonly count: number;

  constructor(items: Ebs[]) {
    this.items = items;

    this.count = items.length;
  }
}
