// Elastic Block Store
export class Ebs {
  readonly id: string;
  readonly size: number;
  readonly type: string;
  readonly CreateTime?: string;
  readonly price?: string;
  readonly nameTag?: string;

  constructor (id: string, size: number, type: string, createTime?: string, price?: string, nameTag?: string) {
    this.id = id
    this.size = size
    this.type = type
    this.CreateTime = createTime
    this.price = price
    this.nameTag = nameTag
  }
}
