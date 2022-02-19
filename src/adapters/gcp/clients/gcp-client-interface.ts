export interface GcpClientInterface {
  getCollectCommands (): any

  // getCleanCommands (request: any): Promise<any>
  //
  // isCleanRequestValid (request: any): boolean
  //
  // formatCollectResponse (response: any): Promise<any>
  //
  // getAdditionalDataForFormattedCollectResponse (response: any): Promise<any>
}
