export class Eip {
  readonly ipAddress: string;
  readonly pricePerMonth?: string;
  readonly nameTag?: string;

  constructor (ipAddress: string, pricePerMonth?: string, nameTag?: string) {
    this.ipAddress = ipAddress
    this.pricePerMonth = pricePerMonth
    this.nameTag = nameTag
  }
}
