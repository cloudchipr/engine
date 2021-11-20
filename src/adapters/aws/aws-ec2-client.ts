import {
  DescribeImagesCommand,
  DescribeImagesCommandInput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { CredentialProvider } from '@aws-sdk/types'

export default class AwsEc2Client {
    private readonly credentialProvider: CredentialProvider;

    constructor (credentialProvider: CredentialProvider) {
      this.credentialProvider = credentialProvider
    }

    // @todo make explicit response
    async describeImages (imageIds: string[], region: string): Promise<any> {
      try {
        const command = new DescribeImagesCommand({
          ImageIds: imageIds
        } as DescribeImagesCommandInput)
        return await this.getClient(region).send(command)
        // process data.
      } catch (error) {
        console.log(error)
      } finally {
        // finally.
      }
    }

    private getClient (region: string): EC2Client {
      return new EC2Client({
        credentials: this.credentialProvider,
        region
      })
    }
}
