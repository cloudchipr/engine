import {
  DescribeAddressesCommand,
  DescribeAddressesCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { Eip } from '../../../domain/types/aws/eip'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import AwsBaseClient from './aws-base-client'
import { AwsClientInterface } from './aws-client-interface'

export default class AwsEipClient extends AwsBaseClient implements AwsClientInterface {
  getCommands (region: string): any[] {
    const commands = []
    commands.push(this.getClient(region).send(this.getCommand()))
    return commands
  }

  async formatResponse<Type> (response: DescribeAddressesCommandOutput[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      if (!Array.isArray(res.Addresses) || res.Addresses.length === 0) {
        return
      }
      res.Addresses.forEach((address) => {
        data.push(new Eip(
          address.PublicIp || '',
          address.NetworkBorderGroup || '',
          address.AllocationId,
          address.AssociationId,
          address.Domain,
          address.InstanceId,
          TagsHelper.getNameTagValue(address.Tags || []),
          TagsHelper.formatTags(address.Tags)
        ))
      })
    })
    await this.awsPriceCalculator.putEipPrices(data)
    return new Response<Type>(data)
  }

  private getClient (region: string): EC2Client {
    return new EC2Client({ credentials: this.credentialProvider, region })
  }

  private getCommand (): DescribeAddressesCommand {
    return new DescribeAddressesCommand({})
  }
}
