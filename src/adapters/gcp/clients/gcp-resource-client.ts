import { google } from 'googleapis'

export default class GcpResourceClient {
  async getProject (): Promise<string> {
    try {
      const auth = new google.auth.GoogleAuth()
      return await auth.getProjectId()
    } catch (e) {
      return 'N/A'
    }
  }
}
