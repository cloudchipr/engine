import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'
import { AwsClientInterface } from './aws-client-interface'
import AwsEbsClient from './aws-ebs-client'
import AwsEc2Client from './aws-ec2-client'
import AwsEipClient from './aws-eip-client'
import AwsElbClient from './aws-elb-client'
import AwsRdsClient from './aws-rds-client'
import { AwsSubCommand } from '../../../aws-sub-command'

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

  async cleanResources<Type> (ids: string[]): Promise<any> {
    const success: any = {}
    const failure: any = {}
    const promises: any[] = []
    for (const id of ids) {
      promises.push(this.awsClientInstance.getCleanCommands(id))
    }
    const response = await Promise.allSettled(promises)
    // const success: any[] = []
    // const failure: any[] = []
    // let lastId: string
    // response.forEach((r: any) => {
    //   if (typeof r.value === 'string') {
    //     lastId = r.value
    //   } else {
    //     if (r.status === 'fulfilled') {
    //       success.push(lastId)
    //     } else {
    //       failure.push({ id: lastId, reason: r.errorMessage })
    //     }
    //   }
    // })
    // console.log(success)
    console.log(response)
    console.log('========================')
    return response
  }

  private static getAwsClient (subcommand: string, credentialProvider: CredentialProvider): AwsClientInterface {
    switch (subcommand) {
      case AwsSubCommand.EC2_SUBCOMMAND:
        return new AwsEc2Client(credentialProvider)
      case AwsSubCommand.EBS_SUBCOMMAND:
        return new AwsEbsClient(credentialProvider)
      case AwsSubCommand.ELB_SUBCOMMAND:
        return new AwsElbClient(credentialProvider)
      case AwsSubCommand.EIP_SUBCOMMAND:
        return new AwsEipClient(credentialProvider)
      case AwsSubCommand.RDS_SUBCOMMAND:
        return new AwsRdsClient(credentialProvider)
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
