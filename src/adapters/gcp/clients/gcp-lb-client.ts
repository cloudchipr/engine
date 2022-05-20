import { ForwardingRulesClient, GlobalForwardingRulesClient } from '@google-cloud/compute'
import { Response } from '../../../responses/response'
import { StringHelper } from '../../../helpers/string-hepler'
import { Label } from '../../../domain/types/gcp/shared/label'
import { CredentialBody } from 'google-auth-library'
import { Lb } from '../../../domain/types/gcp/lb'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanGcpLbEipMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'

export class GcpLbClient {
  static async collectAll<Type> (credentials: CredentialBody, project: string): Promise<Response<Type>> {
    const response = GcpLbClient.getClient(credentials).aggregatedListAsync({ project })
    return GcpLbClient.formatCollectResponse(response)
  }

  static getCleanCommands (credentials: CredentialBody, project: string, request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    if (metadata.global) {
      return GcpLbClient.getGlobalClient(credentials).delete({ forwardingRule: request.id, project })
    } else {
      return GcpLbClient.getClient(credentials).delete({ forwardingRule: request.id, region: metadata.region, project })
    }
  }

  static isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanGcpLbEipMetadataInterface
    return metadata.global || !!metadata.region
  }

  private static async formatCollectResponse<Type> (response: any): Promise<Response<Type>> {
    const data: any[] = []
    for await (const [, value] of response) {
      value.forwardingRules?.forEach((v: any) => {
        data.push(new Lb(
          v.name,
          StringHelper.splitAndGetAtIndex(v.region, '/', -1) || '',
          v.IPProtocol,
          !('region' in v),
          v.creationTimestamp,
          Label.createInstances(v.labels)
        ))
      })
    }
    return new Response<Type>(data)
  }

  private static getClient (credentials: CredentialBody): ForwardingRulesClient {
    return new ForwardingRulesClient({ credentials })
  }

  private static getGlobalClient (credentials: CredentialBody): GlobalForwardingRulesClient {
    return new GlobalForwardingRulesClient({ credentials })
  }
}
