import moment from 'moment'
import { Code } from '../responses/code'

export class AwsApiError extends Error {
  readonly resource: string
  readonly type: string
  readonly dateTime: string

  constructor (resource: string, data: any) {
    super(data.message ?? '')
    Object.setPrototypeOf(this, AwsApiError.prototype)

    this.resource = resource
    this.type = Code.UNKNOWN // @todo add a mapping for know types
    this.dateTime = moment().format('dddd, MMMM Do YYYY, h:mm:ss A Z')
  }

  toJson (): {resource: string, type: string, message: string | undefined} {
    return {
      resource: this.resource,
      type: this.type,
      message: this.message
    }
  }
}
