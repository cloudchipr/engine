import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'
import {
  AwsClientCommandOutputTypeType,
  AwsClientCommandType,
  AwsClientImplementationType,
  AwsClientType
} from '../interfaces'
import AwsEbsClient from './aws-ebs-client'
import AwsEc2Client from './aws-ec2-client'
import AwsEipClient from './aws-eip-client'
import AwsElbClient from './aws-elb-client'
import AwsRdsClient from './aws-rds-client'

export default class AwsClient {
  private awsClientInstance: AwsClientImplementationType;

  constructor (subcommand: string) {
    this.awsClientInstance = AwsClient.getAwsClient(subcommand)
  }

  getResources (credentialProvider: CredentialProvider, regions: string[]): Promise<any>[] {
    const promises = []
    for (const region of regions) {
      const client: AwsClientType = this.awsClientInstance.getClient(credentialProvider, region)
      const command: AwsClientCommandType = this.awsClientInstance.getCommand()
      // @ts-ignore
      promises.push(client.send(command))
    }
    return promises
  }

  formatResponse<Type> (response: AwsClientCommandOutputTypeType): Response<Type> {
    return this.awsClientInstance.formatResponse<Type>(response)
  }

  private static getAwsClient (subcommand: string): AwsClientImplementationType {
    switch (subcommand) {
      case 'ec2':
        return new AwsEc2Client()
      case 'ebs':
        return new AwsEbsClient()
      case 'elb':
        return new AwsElbClient()
      case 'eip':
        return new AwsEipClient()
      case 'rds':
        return new AwsRdsClient()
      default:
        throw new Error('Test Error')
    }
  }
}
