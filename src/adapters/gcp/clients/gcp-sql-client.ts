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
import { GcpBaseClient } from './gcp-base-client'
import { GcpClientInterface } from './gcp-client-interface'

export class GcpSqlClient extends GcpBaseClient implements GcpClientInterface {
  static readonly METRIC_NETWORK_CONNECTIONS_NAME: string = 'cloudsql.googleapis.com/database/network/connections'
  static readonly METRIC_BACKENDS_NAME: string = 'cloudsql.googleapis.com/database/postgresql/num_backends'
  static readonly METRIC_NAME_MAPPING = {
    [GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME]: 'databaseConnections',
    [GcpSqlClient.METRIC_BACKENDS_NAME]: 'databaseConnections'
  }

  static readonly SERIES_ALIGNERS = {
    MAX: 'ALIGN_MAX',
    MIN: 'ALIGN_MIN',
    SUM: 'ALIGN_SUM',
    MEAN: 'ALIGN_MEAN'
  }

  async collectAll (): Promise<Response<Sql>> {
    let data: Sql[] = []
    const errors: any[] = []
    try {
      const response = await Promise.all([
        google.sqladmin('v1beta4').instances.list({ auth: this.authClient, project: this.projectId }),
        this.getMetric(GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME, GcpSqlClient.SERIES_ALIGNERS.MAX),
        this.getMetric(GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME, GcpSqlClient.SERIES_ALIGNERS.MIN),
        this.getMetric(GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME, GcpSqlClient.SERIES_ALIGNERS.SUM),
        this.getMetric(GcpSqlClient.METRIC_NETWORK_CONNECTIONS_NAME, GcpSqlClient.SERIES_ALIGNERS.MEAN),
        this.getMetric(GcpSqlClient.METRIC_BACKENDS_NAME, GcpSqlClient.SERIES_ALIGNERS.MAX),
        this.getMetric(GcpSqlClient.METRIC_BACKENDS_NAME, GcpSqlClient.SERIES_ALIGNERS.MIN),
        this.getMetric(GcpSqlClient.METRIC_BACKENDS_NAME, GcpSqlClient.SERIES_ALIGNERS.SUM),
        this.getMetric(GcpSqlClient.METRIC_BACKENDS_NAME, GcpSqlClient.SERIES_ALIGNERS.MEAN)
      ])
      data = this.formatCollectResponse(response[0])
      this.formatMetric(data, response.slice(1, -1))
    } catch (e: any) {
      errors.push(new GcpApiError(GcpSubCommand.SQL_SUBCOMMAND, e))
    }
    return new Response<Sql>(data, errors)
  }

  async clean (request: CleanRequestResourceInterface): Promise<any> {
    return google.sqladmin('v1beta4').instances.delete({
      instance: request.id,
      auth: this.authClient,
      project: this.projectId
    })
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    return !!request.id
  }

  private formatCollectResponse (response: any): Sql[] {
    const data: Sql[] = []
    Object.values(response.data.items ?? {}).forEach((v: any) => {
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
    return data
  }

  private async getMetric (metricName: string, seriesAligner: string): Promise<any> {
    const config: any = this.getTimeSeriesRequest(metricName, seriesAligner)
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

  private formatMetric (sql: Sql[], data: any[]): void {
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
    sql.map((item: Sql) => {
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
  }

  private getTimeSeriesRequest (metricName: string, seriesAligner: string) {
    return {
      auth: this.authClient,
      name: `projects/${this.projectId}`,
      filter: `metric.type="${metricName}" AND resource.type="cloudsql_database"`,
      'interval.startTime': moment().subtract(30, 'days').format(),
      'interval.endTime': moment().format(),
      'aggregation.alignmentPeriod': '86400s',
      'aggregation.perSeriesAligner': seriesAligner
    }
  }
}
