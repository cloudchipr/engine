export class Eip {
  readonly ip: string;
  readonly price?: string;
  readonly nameTag?: string;

  constructor (ip: string, price?: string, nameTag?: string) {
    this.ip = ip
    this.price = price
    this.nameTag = nameTag
  }
}
