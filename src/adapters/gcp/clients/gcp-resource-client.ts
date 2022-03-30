import { IAMCredentialsClient } from '@google-cloud/iam-credentials'

export default class GcpResourceClient {
  async getProject (): Promise<string> {
    try {
      return await (new IAMCredentialsClient()).getProjectId()
    } catch (e) {
      return 'N/A'
    }
  }
}
