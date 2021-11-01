// Elastic Compute Cloud
export class Ec2 {
  readonly instanceId: string;
  readonly instanceType: string;
  readonly cpu: string;
  readonly netIn: string;
  readonly netOut: string;
  readonly pricePerMonth?: string;
  readonly age?: string;
  readonly nameTag?: string;

  constructor (instanceId: string, instanceType: string, cpu: string, netIn: string, netOut: string, pricePerMonth?: string, age?: string, nameTag?: string) {
    this.instanceId = instanceId
    this.instanceType = instanceType
    this.cpu = cpu
    this.netIn = netIn
    this.netOut = netOut
    this.pricePerMonth = pricePerMonth
    this.age = age
    this.nameTag = nameTag
  }
}
