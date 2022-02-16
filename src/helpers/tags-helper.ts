import { Tag as Ec2Tag } from '@aws-sdk/client-ec2'
import { Tag as ElbV3Tag } from '@aws-sdk/client-elastic-load-balancing'
import { Tag as ElbV2Tag } from '@aws-sdk/client-elastic-load-balancing-v2'
import { Tag as RdsTag } from '@aws-sdk/client-rds'
import { Tag } from '../domain/tag'

export class TagsHelper {
  static getNameTagValue (tags: any[]): string {
    return tags?.find(tagObject => ['NAME', 'Name', 'name'].includes(tagObject.Key))?.Value ?? ''
  }

  static formatTags (tags?: (Ec2Tag | RdsTag | ElbV3Tag | ElbV2Tag)[]): Tag[] {
    return tags?.reduce((previousValue: Tag[], currentValue) => {
      if (currentValue.Key !== undefined && currentValue.Value !== undefined) {
        return [...previousValue, new Tag(currentValue.Key, currentValue.Value)]
      }
      return previousValue
    }, []) ?? []
  }
}
