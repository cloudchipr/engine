export class Elb {
  readonly dnsName: string;
  readonly age?: string;
  readonly pricePerMonth?: string;
  readonly nameTag?: string;

  constructor (dnsName: string, age?: string, pricePerMonth?: string, nameTag?: string) {
    this.dnsName = dnsName
    this.age = age
    this.pricePerMonth = pricePerMonth
    this.nameTag = nameTag
  }
}
