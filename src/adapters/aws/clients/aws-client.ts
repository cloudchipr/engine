import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'
import { AwsClientType, CommandOutputType } from '../interfaces'
import AwsEbsClient from './aws-ebs-client'
import AwsEc2Client from './aws-ec2-client'

export default class AwsClient {
  private awsClientInstance: AwsClientType;

  constructor (subcommand: string) {
    this.awsClientInstance = AwsClient.getAwsClient(subcommand)
  }

  getResources (credentialProvider: CredentialProvider, regions: string[]): Promise<any>[] {
    const promises = []
    for (const region of regions) {
      const client = this.awsClientInstance.getClient(credentialProvider, region)
      const command = this.awsClientInstance.getCommand()
      // @ts-ignore
      promises.push(client.send(command))
    }
    return promises
  }

  formatResponse (response: CommandOutputType): any {
    return this.awsClientInstance.formatResponse(response)
  }

  generateResponse<Type> (responseJson: any): Promise<Response<Type>> {
    return this.awsClientInstance.generateResponse<Type>(responseJson)
  }

  private static getAwsClient (subcommand: string): AwsClientType {
    switch (subcommand) {
      case 'ec2':
        return new AwsEc2Client()
      case 'ebs':
        return new AwsEbsClient()
      default:
        throw new Error('Test Error')
    }
  }
}
