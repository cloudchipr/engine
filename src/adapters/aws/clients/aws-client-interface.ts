import { Response } from '../../../responses/response'
import { AwsClientCommandOutputTypeType } from '../interfaces'

export interface AwsClientInterface {
  getCommands (region: string): any[]

  formatResponse<Type> (response: AwsClientCommandOutputTypeType): Promise<Response<Type>>

  getAdditionalDataForFormattedResponse<Type> (response: Response<Type>): Promise<Response<Type>>
}
