import { GcpClientInterface } from './gcp-client-interface'
import { InstancesClient } from '@google-cloud/compute'
import { Vm, VmMetric } from '../../../domain/types/gcp/vm'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { MetricServiceClient } from '@google-cloud/monitoring'
import moment from 'moment'
import GcpBaseClient from './gcp-base-client'
import { MetricDetails } from '../../../domain/metric-details'
import { CloudBillingClient, CloudCatalogClient } from '@google-cloud/billing'
import fs from 'fs'

export default class GcpVmClient extends GcpBaseClient implements GcpClientInterface {
  static readonly METRIC_CPU_NAME: string = 'compute.googleapis.com/instance/cpu/utilization'
  static readonly METRIC_NETWORK_IN_NAME: string = 'compute.googleapis.com/instance/network/received_bytes_count'
  static readonly METRIC_NETWORK_OUT_NAME: string = 'compute.googleapis.com/instance/network/sent_bytes_count'
  static readonly METRIC_NAME_MAPPING = {
    [GcpVmClient.METRIC_CPU_NAME]: 'cpu',
    [GcpVmClient.METRIC_NETWORK_IN_NAME]: 'networkIn',
    [GcpVmClient.METRIC_NETWORK_OUT_NAME]: 'networkOut'
  }

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
    // const client1 = new CloudBillingClient()
    // conat b = client1.listBillingAccounts()
    const client2 = new CloudCatalogClient()
    const a = await client2.listServices()
    a?.forEach(s => {
      if (Array.isArray(s)) {
        s?.forEach(y => {
          if (y.displayName === 'Compute Engine') {
            console.log(y)
          }
        })
      }
    })
    // 6F81-5844-456A
    const b = await client2.listSkus({parent: 'services/6F81-5844-456A'})
    await fs.promises.writeFile('./aaa.json', JSON.stringify(b), 'utf8')
    // b?.forEach(s => {
    //   if (Array.isArray(s)) {
    //     s?.forEach(y => {
    //       if (y.displayName === 'Compute Engine') {
    //         console.log(y)
    //       }
    //     })
    //   }
    // })
    return new Response<Type>(data)
  }

  async getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    const client = GcpVmClient.getMetricServiceClient()
    const promises: any[] = []
    // @ts-ignore
    response.items.forEach((item: Vm) => {
      // @ts-ignore
      promises.push(client.listTimeSeries(GcpVmClient.getTimeSeriesRequest(client, GcpVmClient.METRIC_CPU_NAME, item.name, 'ALIGN_MAX')))
      // @ts-ignore
      promises.push(client.listTimeSeries(GcpVmClient.getTimeSeriesRequest(client, GcpVmClient.METRIC_NETWORK_IN_NAME, item.name, 'ALIGN_SUM')))
      // @ts-ignore
      promises.push(client.listTimeSeries(GcpVmClient.getTimeSeriesRequest(client, GcpVmClient.METRIC_NETWORK_OUT_NAME, item.name, 'ALIGN_SUM')))
    })
    const metricsResponse = await Promise.all(promises)
    const formattedMetrics = this.formatMetricsResponse(metricsResponse)
    // @ts-ignore
    response.items.map((item: Vm) => {
      if (item.name in formattedMetrics) {
        item.metrics = formattedMetrics[item.name]
      }
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
          const metricName = GcpVmClient.METRIC_NAME_MAPPING[d.metric.type]
          if (!(instanceName in formattedData)) {
            formattedData[instanceName] = new VmMetric()
          }
          formattedData[instanceName][metricName] = d.points.map((p: any) => {
            return MetricDetails.createInstance(
              new Date(parseInt(p.interval.startTime.seconds)),
              p.value.doubleValue ?? p.value.int64Value,
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