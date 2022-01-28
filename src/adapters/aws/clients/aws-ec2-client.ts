import {
  DescribeInstancesCommand,
  DescribeInstancesCommandOutput,
  DescribeSpotPriceHistoryCommand,
  DescribeSpotPriceHistoryCommandInput,
  DescribeSpotPriceHistoryCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { Metric } from '../../../domain/metric'
import { Statistics } from '../../../domain/statistics'
import { Ec2 } from '../../../domain/types/aws/ec2'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import AwsBaseClient from './aws-base-client'
import { AwsClientInterface } from './aws-client-interface'

export default class AwsEc2Client extends AwsBaseClient implements AwsClientInterface {
  getCommands (region: string): any[] {
    const commands = []
    commands.push(this.getClient(region).send(this.getCommand()))
    return commands
  }

  formatResponse<Type> (response: DescribeInstancesCommandOutput[]): Response<Type> {
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
            TagsHelper.getNameTagValue(instance.Tags || [])
          ))
        })
      })
    })
    return new Response<Type>(data)
  }

  async getSpotInstancePrice (region: string, availabilityZone: string, instanceType: string, productDescription: string): Promise<string|undefined> {
    try {
      const command = new DescribeSpotPriceHistoryCommand({
        AvailabilityZone: availabilityZone,
        InstanceTypes: [instanceType],
        ProductDescriptions: [productDescription],
        StartTime: new Date()
      } as DescribeSpotPriceHistoryCommandInput)

      const result: DescribeSpotPriceHistoryCommandOutput = await this.getClient(region).send(command)

      return result.SpotPriceHistory === undefined ? undefined : result.SpotPriceHistory[0].SpotPrice
    } catch (error) {
      console.log(error)
    }
  }

  private getClient (region: string): EC2Client {
    return new EC2Client({ credentials: this.credentialProvider, region })
  }

  private getCommand (): DescribeInstancesCommand {
    return new DescribeInstancesCommand({ MaxResults: 1000 })
  }
}
