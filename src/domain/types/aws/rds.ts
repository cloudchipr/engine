export class Rds {
  readonly dbId: string;
  readonly instanceType: string;
  readonly averageConnections: number;
  readonly pricePerMonth?: string;
  readonly dbType: string;
  readonly nameTag?: string;

  constructor (dbId: string, instanceType: string, averageConnections: number, pricePerMonth: string, dbType: string, nameTag?: string) {
    this.dbId = dbId
    this.instanceType = instanceType
    this.averageConnections = averageConnections
    this.pricePerMonth = pricePerMonth
    this.dbType = dbType
    this.nameTag = nameTag
  }
}
