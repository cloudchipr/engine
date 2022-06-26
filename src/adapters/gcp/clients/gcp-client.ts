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
import { CachingInterface } from '../../caching-interface'
import { PricingInterface } from '../../pricing-interface'
import { BaseExternalAccountClient } from 'google-auth-library'
import { GcpClientInterface } from './gcp-client-interface'
import { GcpTargetPoolClient, TargetPool } from './gcp-target-pool-client'

export class GcpClient {
  protected readonly authClient: BaseExternalAccountClient
  protected readonly projectId: string

  constructor (authClient: BaseExternalAccountClient, projectId: string) {
    this.authClient = authClient
    this.projectId = projectId
  }

  async collectResources<Type> (
    pricingFallbackInterface?: PricingInterface,
    pricingCachingInterface?: CachingInterface
  ): Promise<Response<Type>[]> {
    // get all needed resources
    const responses = await Promise.all([
      this.getClient(GcpSubCommand.VM_SUBCOMMAND).collectAll(),
      this.getClient(GcpSubCommand.DISKS_SUBCOMMAND).collectAll(),
      this.getClient(GcpSubCommand.EIP_SUBCOMMAND).collectAll(),
      this.getClient(GcpSubCommand.SQL_SUBCOMMAND).collectAll(),
      this.getClient(GcpSubCommand.LB_SUBCOMMAND).collectAll(),
      GcpTargetPoolClient.collectAll(this.authClient, this.projectId),
      GcpCatalogClient.collectAllStockKeepingUnits(this.authClient, this.projectId, pricingFallbackInterface, pricingCachingInterface),
    ])
    // set LBs attachment value
    GcpLbClient.setAttachmentValue(responses[4].items as Lb[], responses[0].items as Vm[], responses[5] as TargetPool)
    // calculate prices
    await GcpPriceCalculator.putDisksPrices(responses[1].items as Disks[], this.authClient)
    await GcpPriceCalculator.putVmPrices(responses[0].items as Vm[], responses[1].items as Disks[], this.authClient)
    await GcpPriceCalculator.putEipPrices(responses[2].items as Eip[], this.authClient)
    await GcpPriceCalculator.putSqlPrices(responses[3].items as Sql[], this.authClient)
    await GcpPriceCalculator.putLbPrices(responses[4].items as Lb[], this.authClient)
    return [responses[0], responses[1], responses[2], responses[3], responses[4]] as unknown as Response<Type>[]
  }

  async cleanResources (request: CleanRequestInterface): Promise<CleanResponse> {
    const subcommand = request.subCommand.getValue()
    const client = this.getClient(subcommand)
    const response = new CleanResponse(request.subCommand.getValue())
    const promises: any[] = []
    const ids: string[] = []
    for (const resource of request.resources) {
      if (client.isCleanRequestValid(resource)) {
        promises.push(client.clean(resource))
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

  private getClient (subcommand: string): GcpClientInterface {
    switch (subcommand) {
      case GcpSubCommand.VM_SUBCOMMAND:
        return new GcpVmClient(this.authClient, this.projectId)
      case GcpSubCommand.LB_SUBCOMMAND:
        return new GcpLbClient(this.authClient, this.projectId)
      case GcpSubCommand.DISKS_SUBCOMMAND:
        return new GcpDisksClient(this.authClient, this.projectId)
      case GcpSubCommand.EIP_SUBCOMMAND:
        return new GcpEipClient(this.authClient, this.projectId)
      case GcpSubCommand.SQL_SUBCOMMAND:
        return new GcpSqlClient(this.authClient, this.projectId)
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
