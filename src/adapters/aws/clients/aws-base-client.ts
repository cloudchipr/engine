import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'
import AwsPriceCalculator from '../aws-price-calculator'

export default class AwsBaseClient {
  protected readonly credentialProvider: CredentialProvider
  protected readonly awsPriceCalculator: AwsPriceCalculator

  constructor (credentialProvider: CredentialProvider) {
    this.credentialProvider = credentialProvider
    this.awsPriceCalculator = new AwsPriceCalculator(credentialProvider)
  }

  async getAdditionalDataForFormattedResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    return response
  }
}
