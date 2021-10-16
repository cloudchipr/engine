export class Nlb {
  readonly dnsName: string;
  readonly age?: string;
  readonly price?: string;
  readonly nameTag?: string;

  constructor (dnsName: string, age?: string, price?: string, nameTag?: string) {
    this.dnsName = dnsName
    this.age = age
    this.price = price
    this.nameTag = nameTag
  }
}
