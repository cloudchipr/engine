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

  formatResponse (response: DescribeInstancesCommandOutput[]): any {
    return response.reduce((p: any, r: any) => {
      if (Array.isArray(r.Reservations) && r.Reservations.length) {
        const newInstances = r.Reservations.reduce((p1: any, c1: any) => {
          if (Array.isArray(c1.Instances) && c1.Instances.length) {
            return [...p1, ...c1.Instances]
          } else {
            return [...p1]
          }
        }, [])
        return [...p, ...newInstances]
      } else {
        return [...p]
      }
    }, [])
  }

  async generateResponse<Type> (
    responseJson: any
  ): Promise<Response<Type>> {
    const ec2Items = responseJson.map(
      (ec2ResponseItemJson: {
        InstanceId: string;
        InstanceType: string;
        ImageId: string;
        SpotInstanceRequestId: string|undefined;
        Cpu: string;
        NetworkIn: string;
        NetworkOut: string;
        LaunchTime: string;
        Tags: any[];
        Placement: { Tenancy: string, AvailabilityZone: string };
        PlatformDetails: string;
        UsageOperation: string
      }) => {
        return new Ec2(
          ec2ResponseItemJson.InstanceId,
          ec2ResponseItemJson.ImageId,
          ec2ResponseItemJson.InstanceType,
          ec2ResponseItemJson.LaunchTime,
          ec2ResponseItemJson.Placement.Tenancy,
          ec2ResponseItemJson.Placement.AvailabilityZone,
          ec2ResponseItemJson.SpotInstanceRequestId !== undefined,
          ec2ResponseItemJson.PlatformDetails,
          ec2ResponseItemJson.UsageOperation,
          TagsHelper.getNameTagValue(ec2ResponseItemJson.Tags)
        )
      }
    )
    return new Response<Type>(ec2Items)
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
