import { CredentialProvider } from '@aws-sdk/types'

export class AWSConfiguration {
  constructor (
        readonly credentialProvider: CredentialProvider,
        readonly accessKeyId: string,
        readonly secretAccessKey: string,
        readonly secretToken: string
  ) {
  }
}
