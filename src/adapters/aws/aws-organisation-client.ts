import { CredentialProvider } from '@aws-sdk/types'
import { OrganizationsClient, ListAccountsCommand, ListAccountsCommandInput } from '@aws-sdk/client-organizations'

export default class AwsOrganisationClient {
    private readonly credentialProvider: CredentialProvider;

    constructor (credentialProvider: CredentialProvider) {
      this.credentialProvider = credentialProvider
    }

    async getAllAccounts (): Promise<string[]> {
      let result: any[] = []
      try {
        const client = new OrganizationsClient(
          {
            region: 'eu-east-1',
            credentials: this.credentialProvider
          }
        )
        const params = {
          MaxResults: 20
        } as ListAccountsCommandInput
        do {
          const perPageResult = await client.send(new ListAccountsCommand(params))
          result = result.concat(perPageResult.Accounts)
          params.NextToken = perPageResult.NextToken
        } while (params.NextToken)
      } catch (error) {
        console.log(error)
      }

      return result.map((a: {Id: string}) => a.Id)
    }
}
