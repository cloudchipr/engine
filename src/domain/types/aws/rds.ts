import { ProviderResource } from '../provider-resource'
import { Metric } from '../../metric'
import { AwsRdsMetric } from '../../aws-rds-metric'

export class Rds extends ProviderResource {
  constructor (
    readonly id: string,
    readonly instanceType: string,
    readonly storageType: string,
    readonly averageConnections: Metric,
    readonly averageIOPS: Metric,
    readonly dbType: string,
    readonly multiAZ: boolean,
    readonly age: string,
    readonly availabilityZone: string,
    public metrics?: AwsRdsMetric,
    readonly nameTag?: string,
    readonly _c8rRegion?: string,
    readonly _c8rAccount?: string
  ) {
    super()
  }

  getRegion (): string {
    return this.availabilityZone.slice(0, -1)
  }
}
