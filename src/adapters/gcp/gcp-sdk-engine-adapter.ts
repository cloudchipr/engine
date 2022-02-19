import GcpClient from './clients/gcp-client'

export class GcpSdkEngineAdapter {
  async execute (): Promise<any> {
    const gcpClient = new GcpClient('vm')
    return gcpClient.collectResources()
  }
}
