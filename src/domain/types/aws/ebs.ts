// Elastic Block Store
export class Ebs {
  readonly id: string;
  readonly size?: number;
  readonly CreateTime?: string;
  readonly price?: string;
  readonly nameTag?: string;

  constructor(id: string, size?: number, createTime?: string, price?: string, nameTag?: string) {
    this.id = id;
    this.size = size;
    this.CreateTime = createTime;
    this.price = price;
    this.nameTag = nameTag;
  }
}
