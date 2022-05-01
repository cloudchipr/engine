import {
  DeleteDBInstanceCommand,
  DescribeDBInstancesCommand,
  DescribeDBInstancesCommandOutput,
  RDSClient
} from '@aws-sdk/client-rds'
import { Metric } from '../../../domain/metric'
import { Statistics } from '../../../domain/statistics'
import { Rds } from '../../../domain/types/aws/rds'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import AwsBaseClient from './aws-base-client'
import { AwsClientInterface } from './aws-client-interface'
import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  GetMetricStatisticsCommandOutput
} from '@aws-sdk/client-cloudwatch'
import moment from 'moment'
import { MetricDetails } from '../../../domain/metric-details'
import { AwsRdsMetric } from '../../../domain/aws-rds-metric'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'

export default class AwsRdsClient extends AwsBaseClient implements AwsClientInterface {
  private readonly ENGINE_WHITELIST = [
    'aurora',
    'aurora-mysql',
    'aurora-postgresql',
    'mariadb',
    'mysql',
    'oracle-ee',
    'oracle-ee-cdb',
    'oracle-se2',
    'oracle-se2-cdb',
    'postgres',
    'sqlserver-ee',
    'sqlserver-se',
    'sqlserver-ex',
    'sqlserver-web'
  ]

  getCollectCommands (region: string): any[] {
    const commands = []
    commands.push(this.getClient(region).send(AwsRdsClient.getDescribeDBInstancesCommand()))
    return commands
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getClient(request.region).send(AwsRdsClient.getDeleteDBInstanceCommand(request.id))
        .then(() => resolve(request.id))
        .catch((e) => reject(e.message))
    })
  }

  async formatCollectResponse<Type> (response: DescribeDBInstancesCommandOutput[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      if (!Array.isArray(res.DBInstances) || res.DBInstances.length === 0) {
        return
      }
      res.DBInstances.forEach((db) => {
        if (!this.ENGINE_WHITELIST.includes(db.Engine || '')) {
          return
        }
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
          undefined,
          TagsHelper.getNameTagValue(db.TagList || []),
          TagsHelper.formatTags(db.TagList)
        ))
      })
    })
    await this.awsPriceCalculator.putRdsPrices(data)
    return new Response<Type>(data)
  }

  async getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    const promises: any[] = []
    // @ts-ignore
    response.items.forEach((rds: Rds) => {
      promises.push(rds.id)
      promises.push(this.getCloudWatchClient(rds.getRegion()).send(AwsRdsClient.getMetricStatisticsCommand(rds.id, 'DatabaseConnections', 'Count')))
    })
    const metricsResponse = await Promise.all(promises)
    const formattedMetrics = this.formatMetricsResponse(metricsResponse)
    // @ts-ignore
    response.items.map((rds: Rds) => {
      rds.metrics = formattedMetrics[rds.id]
      return rds
    })
    return response
  }

  private formatMetricsResponse (metricsResponse: any[]): any {
    const data: any = {}
    let instanceIdentifier: string
    metricsResponse.forEach((metric: GetMetricStatisticsCommandOutput | string) => {
      if (typeof metric === 'string') {
        instanceIdentifier = metric
        data[instanceIdentifier] = new AwsRdsMetric()
        return
      }
      if (metric.Label) {
        data[instanceIdentifier][AwsRdsMetric.getPropertyNameFromString(metric.Label)] = metric.Datapoints
          ?.sort((a: any, b: any) => b.Timestamp - a.Timestamp)
          ?.map((datapoint) => {
            return new MetricDetails(
              datapoint.Timestamp,
              datapoint.Unit,
              datapoint.Average,
              datapoint.Minimum,
              datapoint.Maximum,
              datapoint.Sum
            )
          })
      }
    })
    return data
  }

  private getClient (region: string): RDSClient {
    return new RDSClient({ credentials: this.credentialProvider, region })
  }

  private getCloudWatchClient (region: string): CloudWatchClient {
    return new CloudWatchClient({ credentials: this.credentialProvider, region })
  }

  private static getDescribeDBInstancesCommand (): DescribeDBInstancesCommand {
    return new DescribeDBInstancesCommand({})
  }

  private static getDeleteDBInstanceCommand (instanceIdentifier: string): DeleteDBInstanceCommand {
    return new DeleteDBInstanceCommand({ DBInstanceIdentifier: instanceIdentifier, SkipFinalSnapshot: true })
  }

  private static getMetricStatisticsCommand (instanceIdentifier: string, metricName: string, unit: string): GetMetricStatisticsCommand {
    return new GetMetricStatisticsCommand({
      Period: 86400,
      StartTime: moment().subtract(30, 'days').toDate(),
      EndTime: moment().toDate(),
      Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instanceIdentifier }],
      MetricName: metricName,
      Namespace: 'AWS/RDS',
      Statistics: ['Maximum', 'Minimum', 'Average', 'Sum'],
      Unit: unit
    })
  }
}
