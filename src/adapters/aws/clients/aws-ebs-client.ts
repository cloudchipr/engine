import {
  DeleteVolumeCommand,
  DescribeVolumesCommand,
  DescribeVolumesCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import { Ebs } from '../../../domain/types/aws/ebs'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import AwsBaseClient from './aws-base-client'
import { AwsClientInterface } from './aws-client-interface'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { AwsApiError } from '../../../exceptions/aws-api-error'
import { AwsSubCommand } from '../../../aws-sub-command'

export default class AwsEbsClient extends AwsBaseClient implements AwsClientInterface {
  async collectAll (regions: string[]): Promise<Response<Ebs>> {
    let data: Ebs[] = []
    const errors: any[] = []
    try {
      const promises: any[] = []
      for (const region of regions) {
        promises.push(this.getClient(region).send(AwsEbsClient.getDescribeVolumesCommand()))
      }
      const response: DescribeVolumesCommandOutput[] = await Promise.all(promises)
      data = this.formatCollectResponse(response)
      await this.awsPriceCalculator.putEbsPrices(data)
    } catch (e) {
      errors.push(new AwsApiError(AwsSubCommand.EBS_SUBCOMMAND, e))
    }
    return new Response<Ebs>(data, errors)
  }

  clean (request: CleanRequestResourceInterface): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getClient(request.region).send(AwsEbsClient.getDeleteVolumeCommand(request.id))
        .then(() => resolve(request.id))
        .catch((e) => {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject({ id: request.id, message: e.message, code: e.Code })
        })
    })
  }

  private formatCollectResponse (response: DescribeVolumesCommandOutput[]): Ebs[] {
    const data: Ebs[] = []
    response.forEach((res) => {
      if (!Array.isArray(res.Volumes) || res.Volumes.length === 0) {
        return
      }
      res.Volumes.forEach((volume) => {
        data.push(new Ebs(
          volume.VolumeId || '',
          volume.Size || 0,
          volume.State || '',
          volume.VolumeType || '',
          volume.AvailabilityZone || '',
          (volume.Attachments !== undefined && volume.Attachments.length > 0),
          volume.CreateTime?.toISOString() || '',
          TagsHelper.getNameTagValue(volume.Tags || []),
          TagsHelper.formatTags(volume.Tags)
        ))
      })
    })
    return data
  }

  private getClient (region: string): EC2Client {
    return new EC2Client({ credentials: this.credentialProvider, region })
  }

  private static getDescribeVolumesCommand (): DescribeVolumesCommand {
    return new DescribeVolumesCommand({})
  }

  private static getDeleteVolumeCommand (volumeId: string): DeleteVolumeCommand {
    return new DeleteVolumeCommand({ VolumeId: volumeId })
  }
}
