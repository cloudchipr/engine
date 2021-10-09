// Elastic Block Store
export class Ebs {
  readonly id: string;
  readonly size: number;
  readonly type: string;
  readonly age?: string;
  readonly price?: string;
  readonly nameTag?: string;

  constructor (id: string, size: number, type: string, age?: string, price?: string, nameTag?: string) {
    this.id = id
    this.size = size
    this.type = type
    this.age = age
    this.price = price
    this.nameTag = nameTag
  }
}
