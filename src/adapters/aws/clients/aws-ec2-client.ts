import {
  DescribeInstancesCommand,
  DescribeInstancesCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { Metric } from '../../../domain/metric'
import { Statistics } from '../../../domain/statistics'
import { Ec2 } from '../../../domain/types/aws/ec2'
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
import { AwsEc2Metric } from '../../../domain/aws-ec2-metric'
import { AwsMetricDetails } from '../../../domain/aws-metric-details'

export default class AwsEc2Client extends AwsBaseClient implements AwsClientInterface {
  getCollectCommands (region: string): any[] {
    const commands = []
    commands.push(this.getClient(region).send(AwsEc2Client.getDescribeInstancesCommand()))
    return commands
  }

  async formatCollectResponse<Type> (response: DescribeInstancesCommandOutput[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      if (!Array.isArray(res.Reservations) || res.Reservations.length === 0) {
        return
      }
      res.Reservations.forEach((reservation) => {
        if (!Array.isArray(reservation.Instances) || reservation.Instances.length === 0) {
          return
        }
        reservation.Instances.forEach((instance) => {
          data.push(new Ec2(
            instance.InstanceId || '',
            instance.ImageId || '',
            instance.InstanceType || '',
            new Metric(0, Statistics.Average, 'test'),
            new Metric(0, Statistics.Average, 'test'),
            new Metric(0, Statistics.Average, 'test'),
            instance.LaunchTime?.toISOString() || '',
            instance.Placement?.Tenancy || '',
            instance.Placement?.AvailabilityZone || '',
            instance.SpotInstanceRequestId !== undefined,
            instance.PlatformDetails || '',
            instance.UsageOperation || '',
            undefined,
            TagsHelper.getNameTagValue(instance.Tags || [])
          ))
        })
      })
    })
    await this.awsPriceCalculator.putEc2Prices(data)
    return new Response<Type>(data)
  }

  async getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    const promises: any[] = []
    // @ts-ignore
    response.items.forEach((ec2: Ec2) => {
      promises.push(ec2.id)
      promises.push(this.getCloudWatchClient(ec2.getRegion()).send(AwsEc2Client.getMetricStatisticsCommand(ec2.id, 'CPUUtilization', 'Percent')))
      promises.push(this.getCloudWatchClient(ec2.getRegion()).send(AwsEc2Client.getMetricStatisticsCommand(ec2.id, 'NetworkIn', 'Bytes')))
      promises.push(this.getCloudWatchClient(ec2.getRegion()).send(AwsEc2Client.getMetricStatisticsCommand(ec2.id, 'NetworkOut', 'Bytes')))
    })
    const metricsResponse = await Promise.all(promises)
    const formattedMetrics = this.formatMetricsResponse(metricsResponse)
    // @ts-ignore
    response.items.map((ec2: Ec2) => {
      ec2.metrics = formattedMetrics[ec2.id]
      return ec2
    })
    return response
  }

  private formatMetricsResponse (metricsResponse: any[]): any {
    const data: any = {}
    let instanceId: string
    metricsResponse.forEach((metric: GetMetricStatisticsCommandOutput | string) => {
      if (typeof metric === 'string') {
        instanceId = metric
        data[instanceId] = new AwsEc2Metric()
        return
      }
      if (metric.Label) {
        data[instanceId][AwsEc2Metric.getPropertyNameFromString(metric.Label)] = metric.Datapoints
          ?.sort((a: any, b: any) => b.Timestamp - a.Timestamp)
          ?.map((datapoint) => {
            return new AwsMetricDetails(
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

  private getClient (region: string): EC2Client {
    return new EC2Client({ credentials: this.credentialProvider, region })
  }

  private getCloudWatchClient (region: string): CloudWatchClient {
    return new CloudWatchClient({ credentials: this.credentialProvider, region })
  }

  private static getDescribeInstancesCommand (): DescribeInstancesCommand {
    return new DescribeInstancesCommand({ MaxResults: 1000 })
  }

  private static getMetricStatisticsCommand (instanceId: string, metricName: string, unit: string): GetMetricStatisticsCommand {
    return new GetMetricStatisticsCommand({
      Period: 86400,
      StartTime: moment().subtract(30, 'days').toDate(),
      EndTime: moment().toDate(),
      Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
      MetricName: metricName,
      Namespace: 'AWS/EC2',
      Statistics: ['Maximum', 'Minimum', 'Average', 'Sum'],
      Unit: unit
    })
  }
}
