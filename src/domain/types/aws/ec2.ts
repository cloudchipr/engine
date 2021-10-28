// Elastic Compute Cloud
export class Ec2 {
  readonly id: string;
  readonly type: string;
  readonly cpu: number;
  readonly networkIn: number;
  readonly networkOut: number;
  readonly LaunchTime?: string;
  readonly price?: string;
  readonly nameTag?: string;

  constructor (id: string, type: string, cpu: number, networkIn: number, networkOut: number, LaunchTime: string, price: string, nameTag: string) {
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
