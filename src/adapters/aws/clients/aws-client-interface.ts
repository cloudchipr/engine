import { Response } from '../../../responses/response'
import { AwsClientCommandOutputTypeType } from '../interfaces'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'

export interface AwsClientInterface {
  getCollectCommands (region: string): any[]

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any>

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean

  formatCollectResponse<Type> (response: AwsClientCommandOutputTypeType): Promise<Response<Type>>

  getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>>

  getRateLimit (): number
}
