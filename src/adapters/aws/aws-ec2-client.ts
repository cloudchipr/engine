import {
  DescribeImagesCommand,
  DescribeImagesCommandInput,
  EC2Client
} from '@aws-sdk/client-ec2'

export default class AwsEc2Client {
    private client: EC2Client;

    constructor (region: string, accessKeyId: string, secretAccessKey: string) {
      this.client = new EC2Client({ region: 'eu-central-1', credentials: { accessKeyId, secretAccessKey } })
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
