import { GcpClientInterface } from './gcp-client-interface'
import { DisksClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Disks } from '../../../domain/types/gcp/disks'
import { Label } from '../../../domain/types/gcp/shared/label'
import GcpBaseClient from './gcp-base-client'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpVmDisksMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { google } from 'googleapis'

export default class GcpSqlClient extends GcpBaseClient implements GcpClientInterface {
  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    return promises
  }

  async getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    const auth = new google.auth.GoogleAuth()
    const authClient = await auth.getClient()
    const projectId = await auth.getProjectId()
    // console.log(authClient)
    console.log(projectId)
    const sql = google.sqladmin({
      version: 'v1beta4',
      auth: authClient
    });
    const res = await sql.instances.list({project: 'cloud-test-340820'})
    console.log(res);
    return 'test'
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    return true
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    return new Response<Type>(data)
  }
}
