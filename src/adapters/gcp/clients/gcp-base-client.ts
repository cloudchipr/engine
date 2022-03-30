import { Response } from '../../../responses/response'

export default class GcpBaseClient {
  async getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    return response
  }
}
