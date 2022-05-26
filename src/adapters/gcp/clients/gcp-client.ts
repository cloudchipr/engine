import { Response } from '../../../responses/response'
import { CleanRequestInterface } from '../../../request/clean/clean-request-interface'
import { CleanResponse } from '../../../responses/clean-response'
import { CredentialBody, OAuth2ClientOptions } from 'google-auth-library'
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
  protected readonly credentials: CredentialBody | OAuth2ClientOptions
  protected readonly projectId: string

  constructor (gcpCredentials: CredentialBody | OAuth2ClientOptions, projectId: string) {
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
      GcpCatalogClient.collectAllSql(authClient)
    ])
    // set LBs attachment value
    GcpLbClient.setAttachmentValue(responses[2].items as Lb[], responses[1].items as Vm[], responses[5])
    // calculate prices
    await GcpPriceCalculator.putDisksPrices(responses[0].items as Disks[], authClient)
    await GcpPriceCalculator.putVmPrices(responses[1].items as Vm[], responses[0].items as Disks[], authClient)
    await GcpPriceCalculator.putLbPrices(responses[2].items as Lb[], authClient)
    await GcpPriceCalculator.putEipPrices(responses[3].items as Eip[], authClient)
    await GcpPriceCalculator.putSqlPrices(responses[4].items as Sql[], authClient)
    return [responses[0], responses[1], responses[2], responses[3], responses[4]] as Response<Type>[]
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
        'https://www.googleapis.com/auth/sqlservice.admin'
      ]
    }
    if (GcpClient.instanceOfOAuth2ClientOptions(this.credentials)) {
      options.clientOptions = this.credentials
    } else {
      options.credentials = this.credentials
    }
    const auth = new google.auth.GoogleAuth(options)
    return auth.getClient()
  }

  private static instanceOfOAuth2ClientOptions (data: any): data is OAuth2ClientOptions {
    return 'clientId' in data
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
