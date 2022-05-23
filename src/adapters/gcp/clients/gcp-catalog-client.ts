import { google } from 'googleapis'

export class GcpCatalogClient {
  private static COMPUTING_SERVICE = 'services/6F81-5844-456A'
  private static SQL_SERVICE = 'services/9662-B51E-5089'

  public static COMPUTING_SKU: any[] = []
  public static SQL_SKU: any[] = []

  static async collectAllComputing (auth?: any): Promise<void> {
    if (GcpCatalogClient.COMPUTING_SKU.length) {
      return
    }
    const config: any = auth === undefined ? { parent: GcpCatalogClient.COMPUTING_SERVICE } : { parent: GcpCatalogClient.COMPUTING_SERVICE, auth }
    while (true) {
      const result = await google.cloudbilling('v1').services.skus.list(config)
      GcpCatalogClient.COMPUTING_SKU = [...GcpCatalogClient.COMPUTING_SKU, ...(result?.data?.skus ?? [])]
      if (result?.data?.nextPageToken) {
        config.pageToken = result?.data?.nextPageToken
      } else {
        break
      }
    }
  }

  static async collectAllSql (auth?: any) {
    if (GcpCatalogClient.SQL_SKU.length) {
      return
    }
    const config: any = auth === undefined ? { parent: GcpCatalogClient.SQL_SERVICE } : { parent: GcpCatalogClient.SQL_SERVICE, auth }
    while (true) {
      const result = await google.cloudbilling('v1').services.skus.list(config)
      GcpCatalogClient.SQL_SKU = [...GcpCatalogClient.SQL_SKU, ...(result?.data?.skus ?? [])]
      if (result?.data?.nextPageToken) {
        config.pageToken = result?.data?.nextPageToken
      } else {
        break
      }
    }
  }
}
