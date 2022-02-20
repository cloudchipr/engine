import { Response } from '../../../responses/response'

export interface GcpClientInterface {
  getCollectCommands (region: string): any[]

  // getCleanCommands (request: any): Promise<any>
  //
  // isCleanRequestValid (request: any): boolean

  formatCollectResponse<Type> (response: any): Promise<Response<Type>>

  // getAdditionalDataForFormattedCollectResponse (response: any): Promise<any>
}
