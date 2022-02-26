import { Response } from '../../../responses/response'

export interface GcpClientInterface {
  getCollectCommands (regions: string[]): any[]

  formatCollectResponse<Type> (response: any): Promise<Response<Type>>

  getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>>
}
