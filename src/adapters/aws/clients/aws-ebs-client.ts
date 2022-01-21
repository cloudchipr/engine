import { DescribeVolumesCommand, DescribeVolumesCommandOutput, EC2Client } from '@aws-sdk/client-ec2'
import { CredentialProvider } from '@aws-sdk/types'
import { Ebs } from '../../../domain/types/aws/ebs'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'

export default class AwsEbsClient {
  getClient (credentials: CredentialProvider, region: string): EC2Client {
    return new EC2Client({ credentials, region })
  }

  getCommand (): DescribeVolumesCommand {
    return new DescribeVolumesCommand({ MaxResults: 1000 })
  }

  formatResponse (response: DescribeVolumesCommandOutput[]): any {
    const data: any[] = []
    response.forEach((res) => {
      if (!Array.isArray(res.Volumes) || res.Volumes.length === 0) {
        return
      }
      res.Volumes.forEach((volume) => {
        data.push({
          VolumeId: volume.VolumeId,
          Size: volume.Size,
          State: volume.State,
          VolumeType: volume.VolumeType,
          AvailabilityZone: volume.AvailabilityZone,
          CreateTime: volume.CreateTime,
          Tags: []
        })
      })
    })
    return data
  }

  async generateResponse<Type> (
    responseJson: any
  ): Promise<Response<Type>> {
    const ebsItems = responseJson.map(
      (ebsResponseItemJson: {
        VolumeId: string;
        Size: number;
        State: string;
        VolumeType: string;
        CreateTime: string;
        AvailabilityZone: string;
        Tags: any[];
        C8rRegion: string|undefined;
        C8rAccount: string|undefined;
      }) => {
        return new Ebs(
          ebsResponseItemJson.VolumeId,
          ebsResponseItemJson.Size,
          ebsResponseItemJson.State,
          ebsResponseItemJson.VolumeType,
          ebsResponseItemJson.AvailabilityZone,
          ebsResponseItemJson.CreateTime,
          TagsHelper.getNameTagValue(ebsResponseItemJson.Tags),
          ebsResponseItemJson.C8rRegion,
          ebsResponseItemJson.C8rAccount
        )
      }
    )
    return new Response<Type>(ebsItems)
  }
}
