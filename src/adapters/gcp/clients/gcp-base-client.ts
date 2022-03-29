import { Response } from '../../../responses/response'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'

export default class GcpBaseClient {
  async getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    return response
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    return Boolean(request.id)
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    return new Promise(() => {})
  }
}
