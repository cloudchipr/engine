import { Response } from '../../../responses/response'

export interface GcpClientInterface {
  getCollectCommands (regions: string[]): any[]

  formatCollectResponse<Type> (response: any): Promise<Response<Type>>
}
