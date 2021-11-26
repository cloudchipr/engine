import { CredentialProvider } from '@aws-sdk/types'
import { STSClient, GetCallerIdentityCommand, GetCallerIdentityCommandInput } from '@aws-sdk/client-sts'

export default class AwsAccountClient {
    private readonly credentialProvider: CredentialProvider;

    constructor (credentialProvider: CredentialProvider) {
      this.credentialProvider = credentialProvider
    }

    async getCurrentAccount (): Promise<string | undefined> {
      try {
        const client = new STSClient(
          {
            region: 'us-east-1',
            credentials: this.credentialProvider
          }
        )
        const params = {
        } as GetCallerIdentityCommandInput
        const result = await client.send(new GetCallerIdentityCommand(params))
        return result.Account
      } catch (error) {
        console.log(error)
      }
    }
}
