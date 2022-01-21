import { DescribeDBInstancesCommand, DescribeDBInstancesCommandOutput, RDSClient } from '@aws-sdk/client-rds'
import { CredentialProvider } from '@aws-sdk/types'
import { Metric } from '../../../domain/metric'
import { Statistics } from '../../../domain/statistics'
import { Rds } from '../../../domain/types/aws/rds'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'

export default class AwsRdsClient {
  getClient (credentials: CredentialProvider, region: string): RDSClient {
    return new RDSClient({ credentials, region })
  }

  getCommand (): DescribeDBInstancesCommand {
    return new DescribeDBInstancesCommand({ MaxRecords: 100 })
  }

  formatResponse<Type> (response: DescribeDBInstancesCommandOutput[]): Response<Type> {
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
    return new Response<Type>(data)
  }
}
