import {
  DescribeImagesCommand,
  DescribeImagesCommandInput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { CredentialProvider } from '@aws-sdk/types'

export default class AwsEc2Client {
    private client: EC2Client;

    constructor (credentialProvider: CredentialProvider) {
      this.client = new EC2Client({
        credentials: credentialProvider
      })
    }

    // @todo make explicit response
    async describeImages (imageIds: string[]): Promise<any> {
      try {
        const command = new DescribeImagesCommand({
          ImageIds: imageIds
        } as DescribeImagesCommandInput)
        return await this.client.send(command)
        // process data.
      } catch (error) {
        console.log(error)
      } finally {
        // finally.
      }
    }
}
