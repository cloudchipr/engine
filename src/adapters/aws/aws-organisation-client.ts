import { CredentialProvider } from '@aws-sdk/types'
import { OrganizationsClient, ListAccountsCommand, ListAccountsCommandInput } from '@aws-sdk/client-organizations'

export default class AwsOrganisationClient {
    private readonly credentialProvider: CredentialProvider;

    constructor (credentialProvider: CredentialProvider) {
        this.credentialProvider = credentialProvider
    }

    async getAllAccounts (): Promise<string[]> {
        let result: any[] = []
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

        return result.map((a: {Id: string}) => a.Id)
    }
}
