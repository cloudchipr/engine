import { DescribeVolumesCommand, DescribeVolumesCommandOutput, EC2Client } from '@aws-sdk/client-ec2'
import { Ebs } from '../../../domain/types/aws/ebs'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import AwsBaseClient from './aws-base-client'
import { AwsClientInterface } from './aws-client-interface'

export default class AwsEbsClient extends AwsBaseClient implements AwsClientInterface {
  getCommands (region: string): any[] {
    const commands = []
    commands.push(this.getClient(region).send(this.getCommand()))
    return commands
  }

  async formatResponse<Type> (response: DescribeVolumesCommandOutput[]): Promise<Response<Type>> {
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
          volume.CreateTime?.toISOString() || '',
          TagsHelper.getNameTagValue(volume.Tags || [])
        ))
      })
    })
    await this.awsPriceCalculator.putEbsPrices(data)
    return new Response<Type>(data)
  }

  private getClient (region: string): EC2Client {
    return new EC2Client({ credentials: this.credentialProvider, region })
  }

  private getCommand (): DescribeVolumesCommand {
    return new DescribeVolumesCommand({ MaxResults: 1000 })
  }
}
