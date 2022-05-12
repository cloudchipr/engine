import { Response } from '../../../responses/response'
import { CredentialBody } from 'google-auth-library'

export default class GcpBaseClient {
  protected readonly credentials: CredentialBody
  protected readonly projectId: string

  constructor (gcpCredentials: CredentialBody, projectId: string) {
    this.credentials = gcpCredentials
    this.projectId = projectId
  }

  async getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    return response
  }
}
