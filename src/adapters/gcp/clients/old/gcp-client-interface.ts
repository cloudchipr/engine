import { Response } from '../../../../responses/response'
import { CleanRequestResourceInterface } from '../../../../request/clean/clean-request-resource-interface'

export interface GcpClientInterface {
  getCollectCommands (regions: string[]): any[]

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any>

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean

  formatCollectResponse<Type> (response: any): Promise<Response<Type>>

  getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>>
}
