import { DescribeVolumesCommand, DescribeVolumesCommandOutput, EC2Client } from '@aws-sdk/client-ec2'
import { CredentialProvider } from '@aws-sdk/types'
import { Ebs } from '../../../domain/types/aws/ebs'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import { AwsClientInterface } from './aws-client-interface'

export default class AwsEbsClient implements AwsClientInterface {
  getCommands (credentialProvider: CredentialProvider, region: string): any[] {
    const commands = []
    commands.push(this.getClient(credentialProvider, region).send(this.getCommand()))
    return commands
  }

  formatResponse<Type> (response: DescribeVolumesCommandOutput[]): Response<Type> {
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
    return new Response<Type>(data)
  }

  private getClient (credentials: CredentialProvider, region: string): EC2Client {
    return new EC2Client({ credentials, region })
  }

  private getCommand (): DescribeVolumesCommand {
    return new DescribeVolumesCommand({ MaxResults: 1000 })
  }
}
