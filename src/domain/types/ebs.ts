// Elastic Block Store
export class Ebs {
  readonly id: string;
  readonly size: number;
  readonly availabilityZone: string;
  readonly creationTime: string;

  constructor(id: string, size: number, availabilityZone: string, creationTime: string) {
    this.id = id;
    this.size = size;
    this.availabilityZone = availabilityZone;
    this.creationTime = creationTime;
  }
}
