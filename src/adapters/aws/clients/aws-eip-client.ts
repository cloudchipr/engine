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
import { AwsApiError } from '../../../exceptions/aws-api-error'
import { AwsSubCommand } from '../../../aws-sub-command'

export default class AwsEipClient extends AwsBaseClient implements AwsClientInterface {
  async collectAll (regions: string[]): Promise<Response<Eip>> {
    let data: Eip[] = []
    const errors: any[] = []
    try {
      const promises: any[] = []
      for (const region of regions) {
        promises.push(this.getClient(region).send(AwsEipClient.getDescribeAddressesCommand()))
      }
      const response: DescribeAddressesCommandOutput[] = await Promise.all(promises)
      data = this.formatCollectResponse(response)
      await this.awsPriceCalculator.putEipPrices(data)
    } catch (e) {
      errors.push(new AwsApiError(AwsSubCommand.EIP_SUBCOMMAND, e))
    }
    return new Response<Eip>(data, errors)
  }

  clean (request: CleanRequestResourceInterface): Promise<any> {
    return new Promise((resolve, reject) => {
      const metadata = request.metadata as CleanAwsEipMetadataInterface
      const id = metadata.domain === 'classic' ? request.id : metadata.allocationId
      this.getClient(request.region)
        .send(AwsEipClient.getReleaseAddressCommand(id as string, metadata.domain))
        .then(() => resolve(request.id))
        .catch((e) => {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject({ id: request.id, message: e.message, code: e.Code })
        })
    })
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanAwsEipMetadataInterface
    return metadata.domain === 'classic' || (metadata.domain === 'vpc' && metadata.allocationId !== undefined)
  }

  private formatCollectResponse (response: DescribeAddressesCommandOutput[]): Eip[] {
    const data: Eip[] = []
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
    return data
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
