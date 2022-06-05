import { Response } from '../../../responses/response'
import { CleanRequestInterface } from '../../../request/clean/clean-request-interface'
import { CleanResponse } from '../../../responses/clean-response'
import { CredentialBody, UserRefreshClientOptions } from 'google-auth-library'
import { GcpDisksClient } from './gcp-disks-client'
import { GcpLbClient } from './gcp-lb-client'
import { GcpEipClient } from './gcp-eip-client'
import { CleanFailureResponse } from '../../../responses/clean-failure-response'
import { GcpVmClient } from './gcp-vm-client'
import { GcpCatalogClient } from './gcp-catalog-client'
import { GcpPriceCalculator } from '../gcp-price-calculator'
import { Disks } from '../../../domain/types/gcp/disks'
import { Vm } from '../../../domain/types/gcp/vm'
import { google } from 'googleapis'
import { Lb } from '../../../domain/types/gcp/lb'
import { Eip } from '../../../domain/types/gcp/eip'
import { GcpSqlClient } from './gcp-sql-client'
import { Sql } from '../../../domain/types/gcp/sql'
import { GcpSubCommand } from '../gcp-sub-command'

export class GcpClient {
  protected readonly credentials: CredentialBody | UserRefreshClientOptions
  protected readonly projectId: string

  constructor (gcpCredentials: CredentialBody | UserRefreshClientOptions, projectId: string) {
    this.credentials = gcpCredentials
    this.projectId = projectId
  }

  async collectResources<Type> (): Promise<Response<Type>[]> {
    const authClient = await this.getAuthClient()
    // get all needed resources
    const responses = await Promise.all([
      GcpDisksClient.collectAll(authClient, this.projectId),
      GcpVmClient.collectAll(authClient, this.projectId),
      GcpLbClient.collectAll(authClient, this.projectId),
      GcpEipClient.collectAll(authClient, this.projectId),
      GcpSqlClient.collectAll(authClient, this.projectId),
      GcpLbClient.collectAllTargetPool(authClient, this.projectId),
      GcpCatalogClient.collectAllComputing(authClient),
      GcpCatalogClient.collectAllSql(authClient),
      // get metrics
      GcpVmClient.getMetricsCpuMax(authClient, this.projectId),
      GcpVmClient.getMetricsCpuMin(authClient, this.projectId),
      GcpVmClient.getMetricsCpuSum(authClient, this.projectId),
      GcpVmClient.getMetricsCpuMean(authClient, this.projectId),
      GcpVmClient.getMetricsNetworkInMax(authClient, this.projectId),
      GcpVmClient.getMetricsNetworkInMin(authClient, this.projectId),
      GcpVmClient.getMetricsNetworkInSum(authClient, this.projectId),
      GcpVmClient.getMetricsNetworkInMean(authClient, this.projectId),
      GcpVmClient.getMetricsNetworkOutMax(authClient, this.projectId),
      GcpVmClient.getMetricsNetworkOutMin(authClient, this.projectId),
      GcpVmClient.getMetricsNetworkOutSum(authClient, this.projectId),
      GcpVmClient.getMetricsNetworkOutMean(authClient, this.projectId)
    ])
    // set LBs attachment value
    GcpLbClient.setAttachmentValue(responses[2].items as Lb[], responses[1].items as Vm[], responses[5])
    // calculate prices
    await GcpPriceCalculator.putDisksPrices(responses[0].items as Disks[], authClient)
    await GcpPriceCalculator.putVmPrices(responses[1].items as Vm[], responses[0].items as Disks[], authClient)
    await GcpPriceCalculator.putLbPrices(responses[2].items as Lb[], authClient)
    await GcpPriceCalculator.putEipPrices(responses[3].items as Eip[], authClient)
    await GcpPriceCalculator.putSqlPrices(responses[4].items as Sql[], authClient)
    // format metrics
    const vm = GcpVmClient.formatMetric(
      responses[1],
      responses[8],
      responses[9],
      responses[10],
      responses[11],
      responses[12],
      responses[13],
      responses[14],
      responses[15],
      responses[16],
      responses[17],
      responses[18],
      responses[19]
    )
    return [responses[0], vm, responses[2], responses[3], responses[4]] as Response<Type>[]
  }

  async cleanResources (request: CleanRequestInterface): Promise<CleanResponse> {
    const authClient = await this.getAuthClient()
    const response = new CleanResponse(request.subCommand.getValue())
    const promises: any[] = []
    const ids: string[] = []
    for (const resource of request.resources) {
      if (GcpClient.getClient(request.subCommand.getValue()).isCleanRequestValid(resource)) {
        promises.push(GcpClient.getClient(request.subCommand.getValue()).clean(authClient, this.projectId, resource))
        ids.push(resource.id)
      } else {
        response.addFailure(new CleanFailureResponse(resource.id, 'Invalid data provided'))
      }
    }
    if (promises.length > 0) {
      const result: any = await Promise.allSettled(promises)
      for (let i = 0; i < result.length; i++) {
        result[i].status === 'fulfilled'
          ? response.addSuccess(ids[i])
          : response.addFailure(new CleanFailureResponse(ids[i], result[i].reason.errors[0].message))
      }
    }
    return response
  }

  private async getAuthClient () {
    const options: {[K: string]: any} = {
      scopes: [
        'https://www.googleapis.com/auth/compute',
        'https://www.googleapis.com/auth/cloud-billing',
        'https://www.googleapis.com/auth/sqlservice.admin',
        'https://www.googleapis.com/auth/monitoring'
      ]
    }
    if (GcpClient.instanceOfCredentialBody(this.credentials)) {
      options.credentials = this.credentials
    } else {
      options.clientOptions = this.credentials
    }
    const auth = new google.auth.GoogleAuth(options)
    return auth.getClient()
  }

  private static instanceOfCredentialBody (data: any): data is CredentialBody {
    return 'private_key' in data
  }

  private static getClient (subcommand: string) {
    switch (subcommand) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return GcpVmClient
      case GcpSubCommand.LB_SUBCOMMAND:
        return GcpLbClient
      case GcpSubCommand.DISKS_SUBCOMMAND:
        return GcpDisksClient
      case GcpSubCommand.EIP_SUBCOMMAND:
        return GcpEipClient
      case GcpSubCommand.SQL_SUBCOMMAND:
        return GcpSqlClient
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
