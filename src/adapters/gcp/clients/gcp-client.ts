import { Response } from '../../../responses/response'
import { CleanRequestInterface } from '../../../request/clean/clean-request-interface'
import { CleanResponse } from '../../../responses/clean-response'
import { GcpDisksClient } from './gcp-disks-client'
import { GcpLbClient } from './gcp-lb-client'
import { GcpEipClient } from './gcp-eip-client'
import { CleanFailureResponse } from '../../../responses/clean-failure-response'
import { GcpVmClient } from './gcp-vm-client'
import { GcpCatalogClient } from './gcp-catalog-client'
import { GcpPriceCalculator } from '../gcp-price-calculator'
import { Disks } from '../../../domain/types/gcp/disks'
import { Vm } from '../../../domain/types/gcp/vm'
import { Lb } from '../../../domain/types/gcp/lb'
import { Eip } from '../../../domain/types/gcp/eip'
import { GcpSqlClient } from './gcp-sql-client'
import { Sql } from '../../../domain/types/gcp/sql'
import { GcpSubCommand } from '../gcp-sub-command'
import { AuthClient } from 'google-auth-library/build/src/auth/authclient'
import { CachingInterface } from '../../caching-interface'

export class GcpClient {
  protected readonly authClient: AuthClient
  protected readonly projectId: string

  constructor (authClient: AuthClient, projectId: string) {
    this.authClient = authClient
    this.projectId = projectId
  }

  async collectResources<Type> (pricingCachingInterface?: CachingInterface): Promise<Response<Type>[]> {
    // get all needed resources
    const responses = await Promise.all([
      GcpDisksClient.collectAll(this.authClient, this.projectId),
      GcpVmClient.collectAll(this.authClient, this.projectId),
      GcpLbClient.collectAll(this.authClient, this.projectId),
      GcpEipClient.collectAll(this.authClient, this.projectId),
      GcpSqlClient.collectAll(this.authClient, this.projectId),
      GcpLbClient.collectAllTargetPool(this.authClient, this.projectId),
      GcpCatalogClient.collectAllStockKeepingUnits(this.authClient, pricingCachingInterface),
      // get vm metrics
      GcpVmClient.getMetricsCpuMax(this.authClient, this.projectId),
      GcpVmClient.getMetricsCpuMin(this.authClient, this.projectId),
      GcpVmClient.getMetricsCpuSum(this.authClient, this.projectId),
      GcpVmClient.getMetricsCpuMean(this.authClient, this.projectId),
      GcpVmClient.getMetricsNetworkInMax(this.authClient, this.projectId),
      GcpVmClient.getMetricsNetworkInMin(this.authClient, this.projectId),
      GcpVmClient.getMetricsNetworkInSum(this.authClient, this.projectId),
      GcpVmClient.getMetricsNetworkInMean(this.authClient, this.projectId),
      GcpVmClient.getMetricsNetworkOutMax(this.authClient, this.projectId),
      GcpVmClient.getMetricsNetworkOutMin(this.authClient, this.projectId),
      GcpVmClient.getMetricsNetworkOutSum(this.authClient, this.projectId),
      GcpVmClient.getMetricsNetworkOutMean(this.authClient, this.projectId),
      // get sql metrics
      GcpSqlClient.getMetricsConnectionsMax(this.authClient, this.projectId),
      GcpSqlClient.getMetricsConnectionsMin(this.authClient, this.projectId),
      GcpSqlClient.getMetricsConnectionsSum(this.authClient, this.projectId),
      GcpSqlClient.getMetricsConnectionsMean(this.authClient, this.projectId),
      GcpSqlClient.getMetricsBackendsMax(this.authClient, this.projectId),
      GcpSqlClient.getMetricsBackendsMin(this.authClient, this.projectId),
      GcpSqlClient.getMetricsBackendsSum(this.authClient, this.projectId),
      GcpSqlClient.getMetricsBackendsMean(this.authClient, this.projectId)
    ])
    // set LBs attachment value
    GcpLbClient.setAttachmentValue(responses[2].items as Lb[], responses[1].items as Vm[], responses[5])
    // calculate prices
    await GcpPriceCalculator.putDisksPrices(responses[0].items as Disks[], this.authClient)
    await GcpPriceCalculator.putVmPrices(responses[1].items as Vm[], responses[0].items as Disks[], this.authClient)
    await GcpPriceCalculator.putLbPrices(responses[2].items as Lb[], this.authClient)
    await GcpPriceCalculator.putEipPrices(responses[3].items as Eip[], this.authClient)
    await GcpPriceCalculator.putSqlPrices(responses[4].items as Sql[], this.authClient)
    // format VM metrics
    const vm = GcpVmClient.formatMetric(
      responses[1],
      responses[7],
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
      responses[18]
    )
    // format SQL metrics
    const sql = GcpSqlClient.formatMetric(
      responses[4],
      responses[19],
      responses[20],
      responses[21],
      responses[22],
      responses[23],
      responses[24],
      responses[25],
      responses[26]
    )
    return [responses[0], vm, responses[2], responses[3], sql] as Response<Type>[]
  }

  async cleanResources (request: CleanRequestInterface): Promise<CleanResponse> {
    const response = new CleanResponse(request.subCommand.getValue())
    const promises: any[] = []
    const ids: string[] = []
    for (const resource of request.resources) {
      if (GcpClient.getClient(request.subCommand.getValue()).isCleanRequestValid(resource)) {
        promises.push(GcpClient.getClient(request.subCommand.getValue()).clean(this.authClient, this.projectId, resource))
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
