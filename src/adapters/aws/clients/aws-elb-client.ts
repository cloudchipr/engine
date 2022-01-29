import {
  DescribeLoadBalancersCommand as V3Command,
  DescribeTagsCommand as V3TagsCommand,
  DescribeLoadBalancersCommandOutput as V3CommandOutput,
  ElasticLoadBalancingClient as V3Client
} from '@aws-sdk/client-elastic-load-balancing'
import {
  DescribeLoadBalancersCommand as V2Command,
  DescribeTagsCommand as V2TagsCommand,
  DescribeLoadBalancersCommandOutput as V2CommandOutput,
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

  async formatResponse<Type> (response: V3CommandOutput[] | V2CommandOutput[]): Promise<Response<Type>> {
    let data: any[] = []
    response.forEach((res) => {
      if (this.instanceOfV3CommandOutput(res)) {
        data = [...data, ...this.formatV3Response(res)]
      } else {
        data = [...data, ...this.formatV2Response(res)]
      }
    })
    await this.awsPriceCalculator.putElbPrices(data)
    return new Response<Type>(data)
  }

  async getAdditionalDataForFormattedResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    const loadBalancerName: any = {}
    const loadBalancerArn: any = {}
    // @ts-ignore
    response.items.forEach((elb: Elb) => {
      if (elb.type === 'classic') {
        if (!(elb.getRegion() in loadBalancerName)) {
          loadBalancerName[elb.getRegion()] = []
        }
        loadBalancerName[elb.getRegion()].push(elb.loadBalancerName)
      } else {
        if (!(elb.getRegion() in loadBalancerArn)) {
          loadBalancerArn[elb.getRegion()] = []
        }
        loadBalancerArn[elb.getRegion()].push(elb.loadBalancerArn)
      }
    })
    const promises: any[] = []
    Object.keys(loadBalancerName).forEach((region) => {
      promises.push(this.getV3Client(region).send(this.getV3TagsCommand(loadBalancerName[region])))
    })
    Object.keys(loadBalancerArn).forEach((region) => {
      promises.push(this.getV2Client(region).send(this.getV2TagsCommand(loadBalancerArn[region])))
    })
    const nameTagResponse = await Promise.all(promises)
    const formattedTags = this.formatNameTagResponse(nameTagResponse)
    // @ts-ignore
    response.items.map((elb: Elb) => {
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

  private formatNameTagResponse (nameTagResponse: any[]): any {
    const data: any = {}
    nameTagResponse.forEach((tag) => {
      if ('TagDescriptions' in tag && Array.isArray(tag.TagDescriptions)) {
        tag.TagDescriptions.forEach((t: any) => {
          if ('LoadBalancerName' in t && t.LoadBalancerName) {
            data[t.LoadBalancerName] = t.Tags
          } else if ('ResourceArn' in t && t.ResourceArn) {
            data[t.ResourceArn] = t.Tags
          }
        })
      }
    })
    return data
  }

  private getV3Client (region: string): V3Client {
    return new V3Client({ credentials: this.credentialProvider, region })
  }

  private getV2Client (region: string): V2Client {
    return new V2Client({ credentials: this.credentialProvider, region })
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
