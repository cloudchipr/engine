import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { google } from 'googleapis'
import { Sql, SqlMetric } from '../../../domain/types/gcp/sql'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { GcpSubCommand } from '../gcp-sub-command'
import { GcpApiError } from '../../../exceptions/gcp-api-error'

export class GcpSqlClient {
  static async collectAll<Type> (auth: any, project: string): Promise<Response<Type>> {
    const data: any[] = []
    const errors: any[] = []
    try {
      const result: any = await google.sqladmin('v1beta4').instances.list({
        auth,
        project
      })
      Object.values(result.data.items ?? {}).forEach((v: any) => {
        data.push(new Sql(
          v.name,
          v.region,
          v.databaseVersion,
          'secondaryGceZone' in v,
          parseFloat(StringHelper.splitAndGetAtIndex(v.settings.tier, '-', -2) || '0'),
          parseFloat(StringHelper.splitAndGetAtIndex(v.settings.tier, '-', -1) || '0'),
          v.settings.dataDiskSizeGb,
          v.createTime,
          undefined,
          new SqlMetric(),
          Label.createInstances(v.settings?.userLabels)
        ))
      })
    } catch (e: any) {
      errors.push(new GcpApiError(GcpSubCommand.SQL_SUBCOMMAND, e))
    }
    return new Response<Type>(data, errors)
  }

  static clean (auth: any, project: string, request: CleanRequestResourceInterface): Promise<any> {
    return google.sqladmin('v1beta4').instances.delete({ instance: request.id, auth, project })
  }

  static isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    return !!request.id
  }
}
