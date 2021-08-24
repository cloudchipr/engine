import { GarbageItemInterface } from './garbage-item-interface';
import { ResourceType } from '../domain/resource-type';
import { Ebs } from '../domain/types/ebs';

export class EbsGarbageItem implements GarbageItemInterface {
  readonly name: string;
  readonly type: ResourceType = ResourceType.EBS;
  readonly size: number;

  private constructor(name: string, size: number) {
    this.name = name;
    this.size = size;
  }

  public static fromEbs(ebs: Ebs): EbsGarbageItem {
    return new EbsGarbageItem(ebs.id, ebs.size);
  }

  getName(): string {
    return this.name;
  }

  getType(): ResourceType {
    return this.type;
  }

  getPrice(): number {
    return 4.104 * this.size;
  }
}
