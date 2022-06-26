import { BaseExternalAccountClient } from 'google-auth-library'

export class GcpBaseClient {
  constructor (
    protected readonly authClient: BaseExternalAccountClient,
    protected readonly projectId: string
  ) {}
}
