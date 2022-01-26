import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'
import { AwsClientCommandOutputTypeType } from '../interfaces'

export interface AwsClientInterface {
  getCommands (credentialProvider: CredentialProvider, region: string): any[]

  formatResponse<Type> (response: AwsClientCommandOutputTypeType): Response<Type>
}
