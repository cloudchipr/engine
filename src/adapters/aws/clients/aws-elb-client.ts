import {
  DescribeLoadBalancersCommand as V3Command,
  DescribeTagsCommand as V3TagsCommand,
  DescribeLoadBalancersCommandOutput as V3CommandOutput,
  DescribeTagsCommandOutput as V3TagCommandOutput,
  ElasticLoadBalancingClient as V3Client
} from '@aws-sdk/client-elastic-load-balancing'
import {
  DescribeLoadBalancersCommand as V2Command,
  DescribeTagsCommand as V2TagsCommand,
  DescribeLoadBalancersCommandOutput as V2CommandOutput,
  DescribeTagsCommandOutput as V2TagCommandOutput,
  ElasticLoadBalancingV2Client as V2Client
} from '@aws-sdk/client-elastic-load-balancing-v2'
import { Elb } from '../../../domain/types/aws/elb'
import { TagsHelper } from '../../../helpers/tags-helper'
import { Response } from '../../../responses/response'
import AwsBaseClient from './aws-base-client'
import { AwsClientInterface } from './aws-client-interface'

export default class AwsElbClient extends AwsBaseClient implements AwsClientInterface {
  getCommands (region: string): any[] {
    const commands = []
    commands.push(this.getV3Client(region).send(this.getV3Command()))
    commands.push(this.getV2Client(region).send(this.getV2Command()))
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

  async getAdditionalDataForFormattedResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    const loadBalancerName: string[] = []
    const loadBalancerArn: string[] = []
    response.items.forEach((elb) => {
      // @ts-ignore
      elb.type === 'classic' ? loadBalancerName.push(elb.loadBalancerName) : loadBalancerArn.push(elb.loadBalancerArn)
    })
    let nameTagV3
    let nameTagV2
    if (loadBalancerName.length) {
      nameTagV3 = await this.getV3Client().send(this.getV3TagsCommand(loadBalancerName))
    }
    if (loadBalancerArn.length) {
      nameTagV2 = await this.getV2Client().send(this.getV2TagsCommand(loadBalancerArn))
    }
    const formattedTags = this.formatNameTagResponse(nameTagV3, nameTagV2)
    response.items.map((elb) => {
      // @ts-ignore
      elb.nameTag = TagsHelper.getNameTagValue(formattedTags[elb.getIdentifierForNameTag()] ?? [])
      return elb
    })
    return response
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
        '',
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
        lb.LoadBalancerArn || '',
        lb.CreatedTime?.toISOString() || '',
        lb.Type || '',
        TagsHelper.getNameTagValue([])
      ))
    })
    return data
  }

  private formatNameTagResponse (responseV3?: V3TagCommandOutput, responseV2?: V2TagCommandOutput): any {
    const data: any = {}
    responseV3?.TagDescriptions?.forEach((t) => {
      if (t.LoadBalancerName) {
        data[t.LoadBalancerName] = t.Tags
      }
    })
    responseV2?.TagDescriptions?.forEach((t) => {
      if (t.ResourceArn) {
        data[t.ResourceArn] = t.Tags
      }
    })
    return data
  }

  private getV3Client (region?: string): V3Client {
    const config = region === undefined ? { credentials: this.credentialProvider } : { credentials: this.credentialProvider, region }
    return new V3Client(config)
  }

  private getV2Client (region?: string): V2Client {
    const config = region === undefined ? { credentials: this.credentialProvider } : { credentials: this.credentialProvider, region }
    return new V2Client(config)
  }

  private getV3Command (): V3Command {
    return new V3Command({ PageSize: 400 })
  }

  private getV3TagsCommand (loadBalancerNames: string[]): V3TagsCommand {
    return new V3TagsCommand({ LoadBalancerNames: loadBalancerNames })
  }

  private getV2Command (): V2Command {
    return new V2Command({ PageSize: 400 })
  }

  private getV2TagsCommand (resourceArns: string[]): V2TagsCommand {
    return new V2TagsCommand({ ResourceArns: resourceArns })
  }

  private instanceOfV3CommandOutput (data: any): data is V3CommandOutput {
    return 'LoadBalancerDescriptions' in data
  }
}
