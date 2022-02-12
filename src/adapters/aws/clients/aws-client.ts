import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'
import { AwsClientInterface } from './aws-client-interface'
import AwsEbsClient from './aws-ebs-client'
import AwsEc2Client from './aws-ec2-client'
import AwsEipClient from './aws-eip-client'
import AwsElbClient from './aws-elb-client'
import AwsRdsClient from './aws-rds-client'

export default class AwsClient {
  private awsClientInstance: AwsClientInterface;

  constructor (subcommand: string, credentialProvider: CredentialProvider) {
    this.awsClientInstance = AwsClient.getAwsClient(subcommand, credentialProvider)
  }

  async collectResources<Type> (regions: string[]): Promise<Response<Type>> {
    let promises: any[] = []
    for (const region of regions) {
      promises = [...promises, ...this.awsClientInstance.getCollectCommands(region)]
    }
    const response = await Promise.all(promises)
    const formattedResponse = await this.awsClientInstance.formatCollectResponse<Type>(response)
    return this.awsClientInstance.getAdditionalDataForFormattedCollectResponse<Type>(formattedResponse)
  }

  async cleanResources<Type> (regions: string[]): Promise<Response<Type>> {
    return this.awsClientInstance.getAdditionalDataForFormattedCollectResponse<Type>(new Response<Type>([]))
  }

  private static getAwsClient (subcommand: string, credentialProvider: CredentialProvider): AwsClientInterface {
    switch (subcommand) {
      case 'ec2':
        return new AwsEc2Client(credentialProvider)
      case 'ebs':
        return new AwsEbsClient(credentialProvider)
      case 'elb':
        return new AwsElbClient(credentialProvider)
      case 'eip':
        return new AwsEipClient(credentialProvider)
      case 'rds':
        return new AwsRdsClient(credentialProvider)
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
