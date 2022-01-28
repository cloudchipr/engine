import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'

export default class AwsBaseClient {
  protected readonly credentialProvider: CredentialProvider;

  constructor (credentialProvider: CredentialProvider) {
    this.credentialProvider = credentialProvider
  }

  async getAdditionalDataForFormattedResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    return response
  }
}
