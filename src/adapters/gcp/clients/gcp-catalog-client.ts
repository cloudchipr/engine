import { CredentialBody } from 'google-auth-library'
import { CloudCatalogClient } from '@google-cloud/billing'
import fs from 'fs'
const https = require('https')


export class GcpCatalogClient {
  private static COMPUTING_SERVICE = 'services/6F81-5844-456A'
  private static SQL_SERVICE = 'services/9662-B51E-5089'

  public static COMPUTING_SKU: any[] = []
  public static SQL_SKU: any[] = []

  static async collectAllComputing (credentials?: CredentialBody): Promise<void> {
    console.time('aaaa')
    https.get('https://cloudbilling.googleapis.com/v1/services/6F81-5844-456A/skus?key=AIzaSyC8OCkl6s6r7VGQu3foWoU08nibH_o8kwQ', async (res: any) => {
      console.timeEnd('aaaa')
      await fs.promises.writeFile('./aaaa.json', res, 'utf8')
    })

    // if (GcpCatalogClient.COMPUTING_SKU.length) {
    //   return
    // }
    console.time('bb')
    const response = GcpCatalogClient.getClient(credentials).listSkusAsync({ parent: GcpCatalogClient.COMPUTING_SERVICE })
    for await (const value of response) {
      // GcpCatalogClient.COMPUTING_SKU.push(value)
    }
    console.timeEnd('bb')

    console.time('cc')
    const respoasdnse = await GcpCatalogClient.getClient(credentials).listSkus({ parent: GcpCatalogClient.COMPUTING_SERVICE })
    console.timeEnd('cc')
  }

  static async collectAllSql (credentials?: CredentialBody) {
    if (GcpCatalogClient.SQL_SKU.length) {
      return
    }
    const response = GcpCatalogClient.getClient(credentials).listSkusAsync({ parent: GcpCatalogClient.SQL_SERVICE })
    for await (const value of response) {
      GcpCatalogClient.SQL_SKU.push(value)
    }
  }

  private static getClient (credentials?: CredentialBody): CloudCatalogClient {
    return credentials !== undefined ? new CloudCatalogClient({ credentials }) : new CloudCatalogClient()
  }
}
