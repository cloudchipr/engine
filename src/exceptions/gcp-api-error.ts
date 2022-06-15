import moment from 'moment'
import { Code } from '../responses/code'

export class GcpApiError extends Error {
  readonly resource: string
  readonly type: string
  readonly dateTime: string

  constructor (resource: string, data: any) {
    super((data?.errors && Array.isArray(data?.errors) ? data?.errors[0]?.message : undefined) ?? data.message ?? '')
    Object.setPrototypeOf(this, GcpApiError.prototype)

    this.resource = resource
    this.type = data?.response?.status === 403 ? Code.PERMISSION : Code.UNKNOWN
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
