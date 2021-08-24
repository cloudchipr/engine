import { ResourceType } from '../domain/resource-type';

export interface GarbageItemInterface {
  getName(): string;
  getType(): ResourceType;
  getPrice(): number;
}
