import {
  DescribeImagesCommand,
  DescribeImagesCommandInput,
  DescribeInstancesCommand,
  DescribeInstancesCommandOutput,
  DescribeSpotPriceHistoryCommand,
  DescribeSpotPriceHistoryCommandInput, DescribeSpotPriceHistoryCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { CredentialProvider } from '@aws-sdk/types'
import { Ec2 } from '../../../domain/types/aws/ec2'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'

export default class AwsEc2Client {
  getClient (credentials: CredentialProvider, region: string): EC2Client {
    return new EC2Client({ credentials, region })
  }

  getCommand (): DescribeInstancesCommand {
    return new DescribeInstancesCommand({ MaxResults: 1000 })
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
            instance.LaunchTime?.toISOString() || '',
            instance.Placement?.Tenancy || '',
            instance.Placement?.AvailabilityZone || '',
            instance.SpotInstanceRequestId !== undefined,
            instance.PlatformDetails,
            instance.UsageOperation,
            TagsHelper.getNameTagValue(instance.Tags || [])
          ))
        })
      })
    })
    return new Response<Type>(data)
  }

  // @todo make explicit response
  async describeImages (credentials: CredentialProvider, imageIds: string[], region: string): Promise<any> {
    try {
      const command = new DescribeImagesCommand({
        ImageIds: imageIds
      } as DescribeImagesCommandInput)
      return await this.getClient(credentials, region).send(command)
      // process data.
    } catch (error) {
      console.log(error)
    }
  }

  async getSpotInstancePrice (credentials: CredentialProvider, region: string, availabilityZone: string, instanceType: string, productDescription: string): Promise<string|undefined> {
    try {
      const command = new DescribeSpotPriceHistoryCommand({
        AvailabilityZone: availabilityZone,
        InstanceTypes: [instanceType],
        ProductDescriptions: [productDescription],
        StartTime: new Date()
      } as DescribeSpotPriceHistoryCommandInput)

      const result: DescribeSpotPriceHistoryCommandOutput = await this.getClient(credentials, region).send(command)

      return result.SpotPriceHistory === undefined ? undefined : result.SpotPriceHistory[0].SpotPrice
    } catch (error) {
      console.log(error)
    }
  }
}
