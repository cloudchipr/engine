import {
  DescribeLoadBalancersCommand,
  DescribeLoadBalancersCommandOutput,
  ElasticLoadBalancingClient
} from '@aws-sdk/client-elastic-load-balancing'
import { CredentialProvider } from '@aws-sdk/types'
import { Elb } from '../../../domain/types/aws/elb'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'

export default class AwsElbClient {
  getClient (credentials: CredentialProvider, region: string): ElasticLoadBalancingClient {
    return new ElasticLoadBalancingClient({ credentials, region })
  }

  getCommand (): DescribeLoadBalancersCommand {
    return new DescribeLoadBalancersCommand({ PageSize: 400 })
  }

  formatResponse<Type> (response: DescribeLoadBalancersCommandOutput[]): Response<Type> {
    const data: any[] = []
    response.forEach((res) => {
      if (!Array.isArray(res.LoadBalancerDescriptions) || res.LoadBalancerDescriptions.length === 0) {
        return
      }
      res.LoadBalancerDescriptions.forEach((lb) => {
        data.push(new Elb(
          lb.LoadBalancerName || '',
          lb.DNSName || '',
          lb.CreatedTime?.toISOString() || '',
          TagsHelper.getNameTagValue([])
        ))
      })
    })
    return new Response<Type>(data)
  }
}
