import {
  DescribeAddressesCommand,
  DescribeAddressesCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { CredentialProvider } from '@aws-sdk/types'
import { Eip } from '../../../domain/types/aws/eip'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import { AwsClientInterface } from './aws-client-interface'

export default class AwsEipClient implements AwsClientInterface {
  getCommands (credentialProvider: CredentialProvider, region: string): any[] {
    const commands = []
    commands.push(this.getClient(credentialProvider, region).send(this.getCommand()))
    return commands
  }

  formatResponse<Type> (response: DescribeAddressesCommandOutput[]): Response<Type> {
    const data: any[] = []
    response.forEach((res) => {
      if (!Array.isArray(res.Addresses) || res.Addresses.length === 0) {
        return
      }
      res.Addresses.forEach((address) => {
        data.push(new Eip(
          address.PublicIp || '',
          address.NetworkBorderGroup || '',
          TagsHelper.getNameTagValue(address.Tags || [])
        ))
      })
    })
    return new Response<Type>(data)
  }

  private getClient (credentials: CredentialProvider, region: string): EC2Client {
    return new EC2Client({ credentials, region })
  }

  private getCommand (): DescribeAddressesCommand {
    return new DescribeAddressesCommand({})
  }
}
