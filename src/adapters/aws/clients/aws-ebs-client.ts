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

export default class AwsEbsClient extends AwsBaseClient implements AwsClientInterface {
  getCollectCommands (region: string): any[] {
    return [
      this.getClient(region).send(AwsEbsClient.getDescribeVolumesCommand())
    ]
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getClient(request.region).send(AwsEbsClient.getDeleteVolumeCommand(request.id))
        .then(() => resolve(request.id))
        .catch((e) => reject(e.message))
    })
  }

  async formatCollectResponse<Type> (response: DescribeVolumesCommandOutput[]): Promise<Response<Type>> {
    const data: any[] = []
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
    await this.awsPriceCalculator.putEbsPrices(data)
    return new Response<Type>(data)
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
