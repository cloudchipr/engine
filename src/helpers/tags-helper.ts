export class TagsHelper {
  static showNameTagValue (tags: any[]): string {
    return tags?.find(tagObject => ['NAME', 'Name', 'name'].includes(tagObject.Key))?.Value ?? ''
  }
}
