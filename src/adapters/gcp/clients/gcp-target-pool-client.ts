import { StringHelper } from '../../../helpers/string-hepler'
import { google } from 'googleapis'
import { BaseExternalAccountClient } from 'google-auth-library'

export interface TargetPool {
  [K: string]: string[]
}

export class GcpTargetPoolClient {
  static async collectAll (auth: BaseExternalAccountClient, project: string): Promise<TargetPool> {
    const data: TargetPool = {}
    try {
      const response: any = await google.compute('v1').targetPools.aggregatedList({ auth, project })
      Object.keys(response.data.items).forEach(key => {
        if ('targetPools' in response.data.items[key] && Array.isArray(response.data.items[key].targetPools)) {
          response.data.items[key].targetPools?.forEach((v: any) => {
            for (const instance of (v.instances || [])) {
              if (!(v.name in data)) {
                data[v.name] = []
              }
              data[v.name].push(StringHelper.splitAndGetAtIndex(instance, '/', -1) || '')
            }
          })
        }
      })
    } catch (e) {}
    return data
  }
}
