export class DateTimeHelper {
  static getAge (datetime?: string): string {
    if (!datetime) {
      return ''
    }
    const now = new Date()
    const date = new Date(datetime)
    const diffTime = Math.abs(now.valueOf() - date.valueOf())
    const diffHours = Math.ceil(diffTime / (1000 * 3600))
    return diffHours < 24 ? `${diffHours} h` : `${Math.ceil(diffHours / 24)} d`
  }
}
