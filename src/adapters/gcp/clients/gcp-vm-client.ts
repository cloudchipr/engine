import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpVmDisksMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { Vm, VmMetric } from '../../../domain/types/gcp/vm'
import moment from 'moment'
import { GcpSubCommand } from '../gcp-sub-command'
import { GcpApiError } from '../../../exceptions/gcp-api-error'
import { MetricDetails } from '../../../domain/metric-details'
import { GcpBaseClient } from './gcp-base-client'
import { GcpClientInterface } from './gcp-client-interface'
const { google } = require('googleapis')

export class GcpVmClient extends GcpBaseClient implements GcpClientInterface {
  static readonly METRIC_CPU_NAME: string = 'compute.googleapis.com/instance/cpu/utilization'
  static readonly METRIC_NETWORK_IN_NAME: string = 'compute.googleapis.com/instance/network/received_bytes_count'
  static readonly METRIC_NETWORK_OUT_NAME: string = 'compute.googleapis.com/instance/network/sent_bytes_count'
  static readonly METRIC_NAME_MAPPING = {
    [GcpVmClient.METRIC_CPU_NAME]: 'cpu',
    [GcpVmClient.METRIC_NETWORK_IN_NAME]: 'networkIn',
    [GcpVmClient.METRIC_NETWORK_OUT_NAME]: 'networkOut'
  }

  static readonly SERIES_ALIGNERS = {
    MAX: 'ALIGN_MAX',
    MIN: 'ALIGN_MIN',
    SUM: 'ALIGN_SUM',
    MEAN: 'ALIGN_MEAN'
  }

  async collectAll (): Promise<Response<Vm>> {
    let data: Vm[] = []
    const errors: any[] = []
    try {
      const response = await Promise.all([
        google.compute('v1').instances.aggregatedList({ auth: this.authClient, project: this.projectId, filter: 'status != TERMINATED' }),
        this.getMetric(GcpVmClient.METRIC_CPU_NAME, GcpVmClient.SERIES_ALIGNERS.MAX),
        this.getMetric(GcpVmClient.METRIC_CPU_NAME, GcpVmClient.SERIES_ALIGNERS.MIN),
        this.getMetric(GcpVmClient.METRIC_CPU_NAME, GcpVmClient.SERIES_ALIGNERS.SUM),
        this.getMetric(GcpVmClient.METRIC_CPU_NAME, GcpVmClient.SERIES_ALIGNERS.MEAN),
        this.getMetric(GcpVmClient.METRIC_NETWORK_IN_NAME, GcpVmClient.SERIES_ALIGNERS.MAX),
        this.getMetric(GcpVmClient.METRIC_NETWORK_IN_NAME, GcpVmClient.SERIES_ALIGNERS.MIN),
        this.getMetric(GcpVmClient.METRIC_NETWORK_IN_NAME, GcpVmClient.SERIES_ALIGNERS.SUM),
        this.getMetric(GcpVmClient.METRIC_NETWORK_IN_NAME, GcpVmClient.SERIES_ALIGNERS.MEAN),
        this.getMetric(GcpVmClient.METRIC_NETWORK_OUT_NAME, GcpVmClient.SERIES_ALIGNERS.MAX),
        this.getMetric(GcpVmClient.METRIC_NETWORK_OUT_NAME, GcpVmClient.SERIES_ALIGNERS.MIN),
        this.getMetric(GcpVmClient.METRIC_NETWORK_OUT_NAME, GcpVmClient.SERIES_ALIGNERS.SUM),
        this.getMetric(GcpVmClient.METRIC_NETWORK_OUT_NAME, GcpVmClient.SERIES_ALIGNERS.MEAN)
      ])
      data = this.formatCollectResponse(response[0])
      this.formatMetric(data, response.slice(1, -1))
    } catch (e: any) {
      errors.push(new GcpApiError(GcpSubCommand.VM_SUBCOMMAND, e))
    }
    return new Response<Vm>(data, errors)
  }

  async clean (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return await google.compute('v1').instances.delete({
      instance: request.id,
      zone: metadata.zone,
      auth: this.authClient,
      project: this.projectId
    })
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return !!metadata.zone
  }

  private formatCollectResponse (response: any): Vm[] {
    const data: Vm[] = []
    Object.keys(response.data.items).forEach(key => {
      if ('instances' in response.data.items[key] && Array.isArray(response.data.items[key].instances)) {
        response.data.items[key].instances?.forEach((v: any) => {
          data.push(new Vm(
            v.id,
            v.name,
            StringHelper.splitAndGetAtIndex(v.zone, '/', -1) || '',
            StringHelper.splitAndGetAtIndex(v.machineType, '/', -1) || '',
            v.disks.map((d: any) => d.deviceName),
            0, // this will be populated during price calculation
            0, // this will be populated during price calculation
            v.creationTimestamp,
            undefined,
            undefined,
            undefined,
            new VmMetric(),
            Label.createInstances(v.labels)
          ))
        })
      }
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

  private formatMetric (vms: Vm[], data: any[]): void {
    const formattedData: any = {}
    data.forEach((d) => {
      d.forEach((r: any) => {
        if (!('data' in r) || !('timeSeries' in r.data) || !Array.isArray(r.data.timeSeries)) {
          return
        }
        const aligner = r.config.params['aggregation.perSeriesAligner']
        const unit = r.data.unit && r.data.unit === '10^2.%' ? 100 : 1
        r.data.timeSeries.forEach((t: any) => {
          const instanceId = t.resource.labels.instance_id
          const metric = GcpVmClient.METRIC_NAME_MAPPING[t.metric.type]
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
            formattedData[instanceId][metric][dt][aligner] = parseFloat(((point.value.doubleValue ?? point.value.int64Value) * unit).toFixed(2))
          })
        })
      })
    })
    vms.map((item: Vm) => {
      if (item.id in formattedData) {
        const metric = new VmMetric()
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
      filter: `metric.type="${metricName}" AND resource.type="gce_instance"`,
      'interval.startTime': moment().subtract(30, 'days').format(),
      'interval.endTime': moment().format(),
      'aggregation.alignmentPeriod': '86400s',
      'aggregation.perSeriesAligner': seriesAligner
    }
  }
}
