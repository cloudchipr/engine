import { InstancesClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CredentialBody } from 'google-auth-library'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpVmDisksMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'
import { Vm, VmMetric } from '../../../domain/types/gcp/vm'
import { MetricServiceClient } from '@google-cloud/monitoring'
import moment from 'moment'
import { GcpSubCommand } from '../gcp-sub-command'
import { GcpApiError } from '../../../exceptions/gcp-api-error'
import fs from 'fs'
const { google } = require('googleapis')

export class GcpVmClient {
  static readonly METRIC_FILTER_LIMIT = 250
  static readonly METRIC_SERIES_ALIGNER = ['ALIGN_MAX', 'ALIGN_MIN', 'ALIGN_SUM', 'ALIGN_MEAN']
  static readonly METRIC_CPU_NAME: string = 'compute.googleapis.com/instance/cpu/utilization'
  static readonly METRIC_NETWORK_IN_NAME: string = 'compute.googleapis.com/instance/network/received_bytes_count'
  static readonly METRIC_NETWORK_OUT_NAME: string = 'compute.googleapis.com/instance/network/sent_bytes_count'
  static readonly METRIC_NAME_MAPPING = {
    [GcpVmClient.METRIC_CPU_NAME]: 'cpu',
    [GcpVmClient.METRIC_NETWORK_IN_NAME]: 'networkIn',
    [GcpVmClient.METRIC_NETWORK_OUT_NAME]: 'networkOut'
  }

  static async collectAll<Type> (auth: any, project: string): Promise<Response<Type>> {
    const data: any[] = []
    const errors: any[] = []
    try {
      const result: any = await google.compute('v1').instances.aggregatedList({
        auth,
        project
      })
      Object.keys(result.data.items).forEach(key => {
        if ('instances' in result.data.items[key] && Array.isArray(result.data.items[key].instances)) {
          result.data.items[key].instances?.forEach((v: any) => {
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
    } catch (e: any) {
      errors.push(new GcpApiError(GcpSubCommand.VM_SUBCOMMAND, e))
    }
    return new Response<Type>(data, errors)
  }

  static clean (auth: any, project: string, request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return google.compute('v1').instances.delete({ instance: request.id, zone: metadata.zone, auth, project })
  }

  static isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpVmDisksMetadataInterface
    return !!metadata.zone
  }

  static async getMetrics<Type> (auth: any, project: string, response: Response<Type>): Promise<Response<Type>> {
    let filterString = ''
    const filters: string[] = []
    // @ts-ignore
    response.items.forEach((item: Vm, index: number) => {
      if (filterString !== '') {
        filterString += ' OR '
      }
      filterString += `resource.labels.instance_id=${item.id}`
      if ((index > 0 && index % (GcpVmClient.METRIC_FILTER_LIMIT - 1) === 0) || index === response.count - 1) {
        filters.push(filterString)
        filterString = ''
      }
    })
    console.log(filters)
    const promises: any[] = []
    filters.forEach((filter: string) => {
      // cpu
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_CPU_NAME, filter, 'ALIGN_MAX')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_CPU_NAME, filter, 'ALIGN_MIN')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_CPU_NAME, filter, 'ALIGN_SUM')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_CPU_NAME, filter, 'ALIGN_MEAN')))

      // network in
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_NETWORK_IN_NAME, filter, 'ALIGN_MAX')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_NETWORK_IN_NAME, filter, 'ALIGN_MIN')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_NETWORK_IN_NAME, filter, 'ALIGN_SUM')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_NETWORK_IN_NAME, filter, 'ALIGN_MEAN')))

      // network out
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_NETWORK_OUT_NAME, filter, 'ALIGN_MAX')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_NETWORK_OUT_NAME, filter, 'ALIGN_MIN')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_NETWORK_OUT_NAME, filter, 'ALIGN_SUM')))
      promises.push(google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_NETWORK_OUT_NAME, filter, 'ALIGN_MEAN')))
    })
    const metricsResponse = await Promise.all(promises)
    await fs.promises.writeFile('./aaa.json', JSON.stringify(metricsResponse), 'utf8')
    // try {
    //   const result: any = await google.monitoring('v3').projects.timeSeries.list(GcpVmClient.getTimeSeriesRequest(auth, project, GcpVmClient.METRIC_CPU_NAME, 'instance-1', 'ALIGN_MAX'))
    //   await fs.promises.writeFile('./aaa.json', JSON.stringify(result), 'utf8')
    //   console.log(moment().subtract(30, 'days').format())
    //   console.log(moment().format())
    // } catch (e: any) {
    //   console.log(e.message)
    // }
    // const client = new MetricServiceClient({ credentials })
    // const promises: any[] = []
    // // @ts-ignore
    // response.items.forEach((item: Vm) => {
    //   // @ts-ignore
    //   promises.push(client.listTimeSeriesAsync(this.getTimeSeriesRequest(client, GcpVmClient.METRIC_CPU_NAME, item.id, 'ALIGN_MAX')))
    //   // @ts-ignore
    //   promises.push(client.listTimeSeriesAsync(this.getTimeSeriesRequest(client, GcpVmClient.METRIC_NETWORK_IN_NAME, item.id, 'ALIGN_SUM')))
    //   // @ts-ignore
    //   promises.push(client.listTimeSeriesAsync(this.getTimeSeriesRequest(client, GcpVmClient.METRIC_NETWORK_OUT_NAME, item.id, 'ALIGN_SUM')))
    // })
    // const metricsResponse = await Promise.all(promises)
    // const formattedMetrics = this.formatMetricsResponse(metricsResponse)
    // // @ts-ignore
    // response.items.map((item: Vm) => {
    //   item.metrics = item.name in formattedMetrics ? formattedMetrics[item.name] : new VmMetric()
    //   return item
    // })
    return response
  }

  private static getTimeSeriesRequest (auth: any, project: string, metricName: string, filter: string, seriesAligner: string) {
    return {
      auth,
      name: `projects/${project}`,
      filter: `metric.type="${metricName}" AND (${filter})`,
      'interval.startTime': moment().subtract(30, 'days').format(),
      'interval.endTime': moment().format(),
      'aggregation.alignmentPeriod': '86400s',
      'aggregation.perSeriesAligner': seriesAligner
    }
  }
}
