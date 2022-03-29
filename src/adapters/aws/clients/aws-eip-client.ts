import {
  DescribeAddressesCommand,
  DescribeAddressesCommandOutput,
  EC2Client, ReleaseAddressCommand
} from '@aws-sdk/client-ec2'
import { Eip } from '../../../domain/types/aws/eip'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import AwsBaseClient from './aws-base-client'
import { AwsClientInterface } from './aws-client-interface'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanAwsEipMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'

export default class AwsEipClient extends AwsBaseClient implements AwsClientInterface {
  getCollectCommands (region: string): any[] {
    const commands = []
    commands.push(this.getClient(region).send(AwsEipClient.getDescribeAddressesCommand()))
    return commands
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    return new Promise((resolve, reject) => {
      const metadata = request.metadata as CleanAwsEipMetadataInterface
      const id = metadata.domain === 'classic' ? request.id : metadata.allocationId
      this.getClient(request.region)
        .send(AwsEipClient.getReleaseAddressCommand(id as string, metadata.domain))
        .then(() => resolve(request.id))
        .catch((e) => reject(e.message))
    })
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanAwsEipMetadataInterface
    return metadata.domain === 'classic' || (metadata.domain === 'vpc' && metadata.allocationId !== undefined)
  }

  async formatCollectResponse<Type> (response: DescribeAddressesCommandOutput[]): Promise<Response<Type>> {
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

  private static getDescribeAddressesCommand (): DescribeAddressesCommand {
    return new DescribeAddressesCommand({})
  }

  private static getReleaseAddressCommand (id: string, domain: string): ReleaseAddressCommand {
    const config = domain === 'classic' ? { PublicIp: id } : { AllocationId: id }
    return new ReleaseAddressCommand(config)
  }
}
