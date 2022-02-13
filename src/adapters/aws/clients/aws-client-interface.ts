import { Response } from '../../../responses/response'
import { AwsClientCommandOutputTypeType } from '../interfaces'

export interface AwsClientInterface {
  getCollectCommands (region: string): any[]

  getCleanCommands (id: string): any

  formatCollectResponse<Type> (response: AwsClientCommandOutputTypeType): Promise<Response<Type>>

  getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>>
}
