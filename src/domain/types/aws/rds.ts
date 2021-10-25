export class Rds {
  readonly dbId: string;
  readonly instanceType: string;
  readonly averageConnections: number;
  readonly dbType: string;
  readonly age?: string;
  readonly price?: string;
  readonly nameTag?: string;

  constructor (dbId: string, instanceType: string, averageConnections: number, dbType: string, age: string, price: string, nameTag: string) {
    this.dbId = dbId
    this.instanceType = instanceType
    this.averageConnections = averageConnections
    this.dbType = dbType
    this.age = age
    this.price = price
    this.nameTag = nameTag
  }
}
