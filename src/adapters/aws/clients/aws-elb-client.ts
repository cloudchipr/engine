import {
  DescribeLoadBalancersCommand as V3Command,
  DescribeLoadBalancersCommandOutput as V3CommandOutput,
  ElasticLoadBalancingClient as V3Client
} from '@aws-sdk/client-elastic-load-balancing'
import {
  DescribeLoadBalancersCommand as V2Command,
  DescribeLoadBalancersCommandOutput as V2CommandOutput,
  ElasticLoadBalancingV2Client as V2Client
} from '@aws-sdk/client-elastic-load-balancing-v2'
import { CredentialProvider } from '@aws-sdk/types'
import { Elb } from '../../../domain/types/aws/elb'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import { AwsClientInterface } from './aws-client-interface'

export default class AwsElbClient implements AwsClientInterface {
  getCommands (credentialProvider: CredentialProvider, region: string): any[] {
    const commands = []
    commands.push(this.getV3Client(credentialProvider, region).send(this.getV3Command()))
    commands.push(this.getV2Client(credentialProvider, region).send(this.getV2Command()))
    return commands
  }

  formatResponse<Type> (response: V3CommandOutput[] | V2CommandOutput[]): Response<Type> {
    let data: any[] = []
    response.forEach((res) => {
      if (this.instanceOfV3CommandOutput(res)) {
        data = [...data, ...this.formatV3Response(res)]
      } else {
        data = [...data, ...this.formatV2Response(res)]
      }
    })
    return new Response<Type>(data)
  }

  private formatV3Response (response: V3CommandOutput): any[] {
    if (!Array.isArray(response.LoadBalancerDescriptions) || response.LoadBalancerDescriptions.length === 0) {
      return []
    }
    const data: any[] = []
    response.LoadBalancerDescriptions.forEach((lb) => {
      data.push(new Elb(
        lb.LoadBalancerName || '',
        lb.DNSName || '',
        lb.CreatedTime?.toISOString() || '',
        'classic',
        TagsHelper.getNameTagValue([])
      ))
    })
    return data
  }

  private formatV2Response (response: V2CommandOutput): any[] {
    if (!Array.isArray(response.LoadBalancers) || response.LoadBalancers.length === 0) {
      return []
    }
    const data: any[] = []
    response.LoadBalancers.forEach((lb) => {
      data.push(new Elb(
        lb.LoadBalancerName || '',
        lb.DNSName || '',
        lb.CreatedTime?.toISOString() || '',
        lb.Type || '',
        TagsHelper.getNameTagValue([])
      ))
    })
    return data
  }

  private getV3Client (credentials: CredentialProvider, region: string): V3Client {
    return new V3Client({ credentials, region })
  }

  private getV2Client (credentials: CredentialProvider, region: string): V2Client {
    return new V2Client({ credentials, region })
  }

  private getV3Command (): V3Command {
    return new V3Command({ PageSize: 400 })
  }

  private getV2Command (): V2Command {
    return new V2Command({ PageSize: 400 })
  }

  private instanceOfV3CommandOutput (data: any): data is V3CommandOutput {
    return 'LoadBalancerDescriptions' in data
  }
}
