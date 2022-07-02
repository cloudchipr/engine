import { CredentialProvider } from '@aws-sdk/types'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'

export default class AwsBaseClient {
  protected readonly credentialProvider: CredentialProvider

  constructor (credentialProvider: CredentialProvider) {
    this.credentialProvider = credentialProvider
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    return !!request.id
  }

  getRateLimit (): number {
    return 250
  }
}
