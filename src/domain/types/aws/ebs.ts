// Elastic Block Store
export class Ebs {
  readonly instanceId: string;
  readonly instanceType: string;
  readonly size: number;
  readonly age?: string;
  readonly pricePerMonth?: string;
  readonly nameTag?: string;

  constructor (instanceId: string, instanceType: string, size: number, age?: string, pricePerMonth?: string, nameTag?: string) {
    this.instanceId = instanceId
    this.instanceType = instanceType
    this.size = size
    this.age = age
    this.pricePerMonth = pricePerMonth
    this.nameTag = nameTag
  }
}
