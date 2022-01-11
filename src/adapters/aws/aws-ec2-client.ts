import {
  DescribeSpotPriceHistoryCommand,
  DescribeSpotPriceHistoryCommandInput,
  DescribeSpotPriceHistoryCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { CredentialProvider } from '@aws-sdk/types'

export default class AwsEc2Client {
    private readonly credentialProvider: CredentialProvider;

    constructor (credentialProvider: CredentialProvider) {
      this.credentialProvider = credentialProvider
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
      return new EC2Client({
        credentials: this.credentialProvider,
        region
      })
    }
}
