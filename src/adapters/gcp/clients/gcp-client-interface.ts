import { Response } from '../../../responses/response'
import { CredentialBody } from 'google-auth-library'

export interface GcpClientInterface {
  collectAll<Type> (credentials: CredentialBody, project: string): Promise<Response<Type>>
}
