import { GcpClientInterface } from './gcp-client-interface'
import { DisksClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { CloudSql } from '../../../domain/types/gcp/cloud-sql'
import { sqladmin } from '@googleapis/sqladmin'
// import { google } from 'googleapis'

export default class GcpCloudSqlClient implements GcpClientInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getCollectCommands (regions: string[]): any[] {
    console.log('Getting sql data')
    return [
      sqladmin({ version: 'v1', auth: '0a6bef0c72d44e341b387b572d6600c1546cfd75' }).instances.list({ project: 'cloud-test-340820' })
    ]
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    // const auth = new sqladmin.auth.GoogleAuth({
    //   keyFilename: 'PATH_TO_SERVICE_ACCOUNT_KEY.json',
    //   // Scopes can be specified either as an array or as a single, space-delimited string.
    //   scopes: ['https://www.googleapis.com/auth/documents']
    // });
    const data: any[] = []
    response.forEach((res) => {
      console.log(res)
      // res.forEach((r: any) => {
      //   r?.forEach((instance: any) => {
      //     data.push(new CloudSql(
      //       instance.name,
      //       StringHelper.splitAndGetAtIndex(instance.zone, '/', -1),
      //     ))
      //   })
      // })
    })
    return new Response<Type>(data)
  }
}
