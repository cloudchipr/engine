import { GcpClientInterface } from './gcp-client-interface'
import { InstancesClient } from '@google-cloud/compute'
import { Vm, VmMetric, VmMetricDetails } from '../../../domain/types/gcp/vm'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { MetricServiceClient } from '@google-cloud/monitoring'
import moment from 'moment'
import GcpBaseClient from './gcp-base-client'

export default class GcpVmClient extends GcpBaseClient implements GcpClientInterface {
  static readonly METRIC_CPU_NAME: string = 'compute.googleapis.com/instance/cpu/utilization'

  getCollectCommands (regions: string[]): any[] {
    const promises: any[] = []
    for (const region of regions) {
      promises.push(GcpVmClient.getClient().list({ project: 'cloud-test-340820', zone: region }))
    }
    return promises
  }

  async formatCollectResponse<Type> (response: any[]): Promise<Response<Type>> {
    const data: any[] = []
    response.forEach((res) => {
      res.forEach((r: any) => {
        r?.forEach((instance: any) => {
          data.push(new Vm(
            instance.name,
            StringHelper.splitAndGetAtIndex(instance.machineType, '/', -1),
            instance.creationTimestamp,
            StringHelper.splitAndGetAtIndex(instance.zone, '/', -1),
            undefined,
            undefined,
            Label.createInstances(instance.labels)
          ))
        })
      })
    })
    return new Response<Type>(data)
  }

  async getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    const client = GcpVmClient.getMetricServiceClient()
    const promises: any[] = []
    // @ts-ignore
    response.items.forEach((item: Vm) => {
      promises.push(
        // @ts-ignore
        client.listTimeSeries(GcpVmClient.getTimeSeriesRequest(client, GcpVmClient.METRIC_CPU_NAME, item.name, 'ALIGN_MAX')))
    })
    const metricsResponse = await Promise.all(promises)
    const formattedMetrics = this.formatMetricsResponse(metricsResponse)
    // @ts-ignore
    response.items.map((item: Vm) => {
      item.metrics = formattedMetrics[item.name]
      return item
    })
    return response
  }

  private formatMetricsResponse (metricsResponse: any[]): any {
    const formattedData: any = {}
    metricsResponse.forEach(timeSeries => {
      timeSeries.forEach((data: any) => {
        if (!Array.isArray(data)) {
          return
        }
        data.forEach(d => {
          const instanceName = d.metric.labels.instance_name
          const metricName = StringHelper.splitAndGetAtIndex(d.metric.type, '/', -2) as string
          formattedData[instanceName] = new VmMetric()
          formattedData[instanceName][metricName] = d.points.map((p: any) => {
            return new VmMetricDetails(
              moment.unix(parseInt(p.interval.startTime.seconds)).utc().format(),
              p.value.doubleValue,
              metricName
            )
          })
        })
      })
    })
    return formattedData
  }

  private static getClient (): InstancesClient {
    return new InstancesClient()
  }

  private static getMetricServiceClient (): MetricServiceClient {
    return new MetricServiceClient()
  }

  private static getTimeSeriesRequest (client: MetricServiceClient, metricName: string, instanceName: string, seriesAligner: string) {
    return {
      name: client.projectPath('cloud-test-340820'),
      filter: `metric.type="${metricName}" AND metric.labels.instance_name = "${instanceName}"`,
      interval: {
        startTime: {
          seconds: moment().subtract(30, 'days').unix()
        },
        endTime: {
          seconds: moment().unix()
        }
      },
      aggregation: {
        alignmentPeriod: {
          seconds: 60 * 60 * 24
        },
        perSeriesAligner: seriesAligner
      }
    }
  }
}
