import { Response } from '../../../responses/response'
import { CleanRequestInterface } from '../../../request/clean/clean-request-interface'
import { CleanResponse } from '../../../responses/clean-response'
import { CredentialBody } from 'google-auth-library'
import { GcpDisksClient } from './gcp-disks-client'
import { GcpLbClient } from './gcp-lb-client'
import { GcpEipClient } from './gcp-eip-client'
import { CleanFailureResponse } from '../../../responses/clean-failure-response'
import { GcpVmClient } from './gcp-vm-client'
import { GcpCatalogClient } from './gcp-catalog-client'
import { GcpPriceCalculator } from '../gcp-price-calculator'
import { Disks } from '../../../domain/types/gcp/disks'
import { Vm } from '../../../domain/types/gcp/vm'

export class GcpClient {
  protected readonly credentials: CredentialBody
  protected readonly projectId: string

  constructor (gcpCredentials: CredentialBody, projectId: string) {
    this.credentials = gcpCredentials
    this.projectId = projectId
  }

  async collectResources<Type> (): Promise<Response<Type>[]> {
    const responses = await Promise.all([
      GcpDisksClient.collectAll(this.credentials, this.projectId),
      // GcpVmClient.collectAll(this.credentials, this.projectId),
      // GcpLbClient.collectAll(this.credentials, this.projectId),
      // GcpEipClient.collectAll(this.credentials, this.projectId),
      GcpCatalogClient.collectAllComputing(this.credentials),
      // GcpCatalogClient.collectAllSql(this.credentials)
    ])
    // await GcpPriceCalculator.putDisksPrices(responses[0].items as Disks[])
    // await GcpPriceCalculator.putVmPrices(responses[1].items as Vm[], responses[0].items as Disks[])
    return [
      responses[0],
      // responses[1],
      // responses[2],
      // responses[3]
    ] as Response<Type>[]
  }

  async cleanResources (request: CleanRequestInterface): Promise<CleanResponse> {
    const response = new CleanResponse(request.subCommand.getValue())
    // const promises: any[] = []
    // const ids: string[] = []
    // for (const resource of request.resources) {
    //   if (this.gcpClientInterface.isCleanRequestValid(resource)) {
    //     promises.push(this.gcpClientInterface.getCleanCommands(resource))
    //     ids.push(resource.id)
    //   } else {
    //     response.addFailure(new CleanFailureResponse(resource.id, 'Invalid data provided'))
    //   }
    // }
    // if (promises.length > 0) {
    //   const result: any = await Promise.allSettled(promises)
    //   for (let i = 0; i < result.length; i++) {
    //     result[i].status === 'fulfilled'
    //       ? response.addSuccess(ids[i])
    //       : response.addFailure(new CleanFailureResponse(ids[i], result[i].reason.errors[0].message))
    //   }
    // }
    return response
  }
}
