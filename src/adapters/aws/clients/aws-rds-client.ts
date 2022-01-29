import { DescribeDBInstancesCommand, DescribeDBInstancesCommandOutput, RDSClient } from '@aws-sdk/client-rds'
import { Metric } from '../../../domain/metric'
import { Statistics } from '../../../domain/statistics'
import { Rds } from '../../../domain/types/aws/rds'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import AwsBaseClient from './aws-base-client'
import { AwsClientInterface } from './aws-client-interface'

export default class AwsRdsClient extends AwsBaseClient implements AwsClientInterface {
  getCommands (region: string): any[] {
    const commands = []
    commands.push(this.getClient(region).send(this.getCommand()))
    return commands
  }

  async formatResponse<Type> (response: DescribeDBInstancesCommandOutput[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      if (!Array.isArray(res.DBInstances) || res.DBInstances.length === 0) {
        return
      }
      res.DBInstances.forEach((db) => {
        data.push(new Rds(
          db.DBInstanceIdentifier || '',
          db.DBInstanceClass || '',
          db.StorageType || '',
          new Metric(0, Statistics.Average, 'test'),
          new Metric(0, Statistics.Average, 'test'),
          db.Engine || '',
          db.MultiAZ || false,
          db.InstanceCreateTime?.toISOString() || '',
          db.AvailabilityZone || '',
          TagsHelper.getNameTagValue(db.TagList || [])
        ))
      })
    })
    await this.awsPriceCalculator.putRdsPrices(data)
    return new Response<Type>(data)
  }

  private getClient (region: string): RDSClient {
    return new RDSClient({ credentials: this.credentialProvider, region })
  }

  private getCommand (): DescribeDBInstancesCommand {
    return new DescribeDBInstancesCommand({ MaxRecords: 100 })
  }
}
