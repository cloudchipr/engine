import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { google } from 'googleapis'
import { Sql, SqlMetric } from '../../../domain/types/gcp/sql'

export class GcpSqlClient {
  static async collectAll<Type> (auth: any, project: string): Promise<Response<Type>> {
    const data: any[] = []
    const result: any = await google.sqladmin('v1beta4').instances.list({ auth, project })
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
    return new Response<Type>(data)
  }
}
