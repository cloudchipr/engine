import { Response } from '../../../responses/response'

export interface GcpClientInterface {
  getCollectCommands (region: string): any[]

  formatCollectResponse<Type> (response: any): Promise<Response<Type>>
}
