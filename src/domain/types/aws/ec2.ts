// Elastic Compute Cloud
export class Ec2 {
  readonly id: string;
  readonly type: string;
  readonly cpu: string;
  readonly networkIn: string;
  readonly networkOut: string;
  readonly LaunchTime?: string;
  readonly price?: string;
  readonly nameTag?: string;

  constructor (id: string, type: string, cpu: string, networkIn: string, networkOut: string, LaunchTime: string, price: string, nameTag: string) {
    this.id = id
    this.type = type
    this.cpu = cpu
    this.networkIn = networkIn
    this.networkOut = networkOut
    this.LaunchTime = LaunchTime
    this.price = price
    this.nameTag = nameTag
  }
}
