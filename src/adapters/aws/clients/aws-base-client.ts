import { CredentialProvider } from '@aws-sdk/types'
import AwsPriceCalculator from '../aws-price-calculator'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'

export default class AwsBaseClient {
  protected readonly credentialProvider: CredentialProvider
  protected readonly awsPriceCalculator: AwsPriceCalculator

  constructor (credentialProvider: CredentialProvider) {
    this.credentialProvider = credentialProvider
    this.awsPriceCalculator = new AwsPriceCalculator(credentialProvider)
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    return !!request.id
  }

  getRateLimit (): number {
    return 250
  }
}
