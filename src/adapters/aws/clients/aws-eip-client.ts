import {
  DescribeAddressesCommand,
  DescribeAddressesCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { CredentialProvider } from '@aws-sdk/types'
import { Eip } from '../../../domain/types/aws/eip'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'

export default class AwsEipClient {
  getClient (credentials: CredentialProvider, region: string): EC2Client {
    return new EC2Client({ credentials, region })
  }

  getCommand (): DescribeAddressesCommand {
    return new DescribeAddressesCommand({})
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
}
