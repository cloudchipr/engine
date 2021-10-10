export class TagsHelper {
  static getNameTagValue (tags: any[]): string {
    return tags?.find(tagObject => ['NAME', 'Name', 'name'].includes(tagObject.Key))?.Value ?? ''
  }
}
