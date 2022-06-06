import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { google } from 'googleapis'
import { Sql, SqlMetric } from '../../../domain/types/gcp/sql'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { GcpSubCommand } from '../gcp-sub-command'
import { GcpApiError } from '../../../exceptions/gcp-api-error'
import moment from 'moment'
import { MetricDetails } from '../../../domain/metric-details'

export class GcpSqlClient {
  static readonly METRIC_NETWORK_CONNECTIONS_NAME: string = 'cloudsql.googleapis.com/database/network/connections'
  static readonly METRIC_BACKENDS_NAME: string = 'cloudsql.googleapis.com/database/postgresql/num_backends'
  static readonly METRIC_NAME_MAPPING = {
    [GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME]: 'databaseConnections',
    [GcpSqlClient.METRIC_BACKENDS_NAME]: 'databaseConnections'
  }

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

  static async getMetricsConnectionsMax (auth: any, project: string): Promise<any> {
    return GcpSqlClient.getMetric(auth, project, GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME, 'ALIGN_MAX')
  }

  static async getMetricsConnectionsMin (auth: any, project: string): Promise<any> {
    return GcpSqlClient.getMetric(auth, project, GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME, 'ALIGN_MIN')
  }

  static async getMetricsConnectionsSum (auth: any, project: string): Promise<any> {
    return GcpSqlClient.getMetric(auth, project, GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME, 'ALIGN_SUM')
  }

  static async getMetricsConnectionsMean (auth: any, project: string): Promise<any> {
    return GcpSqlClient.getMetric(auth, project, GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME, 'ALIGN_MEAN')
  }

  static async getMetricsBackendsMax (auth: any, project: string): Promise<any> {
    return GcpSqlClient.getMetric(auth, project, GcpSqlClient.METRIC_BACKENDS_NAME, 'ALIGN_MAX')
  }

  static async getMetricsBackendsMin (auth: any, project: string): Promise<any> {
    return GcpSqlClient.getMetric(auth, project, GcpSqlClient.METRIC_BACKENDS_NAME, 'ALIGN_MIN')
  }

  static async getMetricsBackendsSum (auth: any, project: string): Promise<any> {
    return GcpSqlClient.getMetric(auth, project, GcpSqlClient.METRIC_BACKENDS_NAME, 'ALIGN_SUM')
  }

  static async getMetricsBackendsMean (auth: any, project: string): Promise<any> {
    return GcpSqlClient.getMetric(auth, project, GcpSqlClient.METRIC_BACKENDS_NAME, 'ALIGN_MEAN')
  }

  static async getMetric (auth: any, project: string, metricName: string, seriesAligner: string): Promise<any> {
    const config: any = GcpSqlClient.getTimeSeriesRequest(auth, project, metricName, seriesAligner)
    const data: any[] = []
    while (true) {
      const result = await google.monitoring('v3').projects.timeSeries.list(config)
      data.push(result ?? [])
      if (result?.data?.nextPageToken) {
        config.pageToken = result?.data?.nextPageToken
      } else {
        break
      }
    }
    return data
  }

  static formatMetric<Type> (response: Response<Type>, ...data: any[]): Response<Type> {
    const formattedData: any = {}
    data.forEach((d) => {
      d.forEach((r: any) => {
        if (!('data' in r) || !('timeSeries' in r.data) || !Array.isArray(r.data.timeSeries)) {
          return
        }
        const aligner = r.config.params['aggregation.perSeriesAligner']
        r.data.timeSeries.forEach((t: any) => {
          const instanceId = t.resource.labels.database_id.split(':')[1]
          const metric = GcpSqlClient.METRIC_NAME_MAPPING[t.metric.type]
          if (t.metric.type === GcpSqlClient.METRIC_BACKENDS_NAME && 'labels' in t.metric && t.metric.labels.database !== 'postgres') {
            return
          }
          if (!(instanceId in formattedData)) {
            formattedData[instanceId] = {}
          }
          if (!(metric in formattedData[instanceId])) {
            formattedData[instanceId][metric] = {}
          }
          t.points.forEach((point: any) => {
            const dt = moment(point.interval.startTime).format('YYYY_MM_DD')
            if (!(dt in formattedData[instanceId][metric])) {
              formattedData[instanceId][metric][dt] = {
                timestamp: new Date(point.interval.startTime)
              }
            }
            formattedData[instanceId][metric][dt][aligner] = parseFloat(parseFloat(point.value.doubleValue ?? point.value.int64Value).toFixed(2))
          })
        })
      })
    })
    // @ts-ignore
    response.items.map((item: Sql) => {
      if (item.id in formattedData) {
        const metric = new SqlMetric()
        Object.keys(formattedData[item.id]).forEach((metricName: string) => {
          const metricDetails: any = []
          Object.values(formattedData[item.id][metricName]).forEach((m: any) => {
            metricDetails.push(MetricDetails.createInstance(m.timestamp, metricName, m.ALIGN_MEAN, m.ALIGN_MIN, m.ALIGN_MAX, m.ALIGN_SUM))
          })
          // @ts-ignore
          metric[metricName] = metricDetails
        })
        item.metrics = metric
      }
      return item
    })
    return response
  }

  private static getTimeSeriesRequest (auth: any, project: string, metricName: string, seriesAligner: string) {
    return {
      auth,
      name: `projects/${project}`,
      filter: `metric.type="${metricName}" AND resource.type="cloudsql_database"`,
      'interval.startTime': moment().subtract(30, 'days').format(),
      'interval.endTime': moment().format(),
      'aggregation.alignmentPeriod': '86400s',
      'aggregation.perSeriesAligner': seriesAligner
    }
  }
}
