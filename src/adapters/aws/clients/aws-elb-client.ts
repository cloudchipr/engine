import {
  DescribeLoadBalancersCommand as V3Command,
  DescribeTagsCommand as V3TagsCommand,
  DescribeLoadBalancersCommandOutput as V3CommandOutput,
  DescribeTagsCommandOutput as V3TagsCommandOutput,
  ElasticLoadBalancingClient as V3Client
} from '@aws-sdk/client-elastic-load-balancing'
import {
  DescribeLoadBalancersCommand as V2Command,
  DescribeTagsCommand as V2TagsCommand,
  DescribeTargetGroupsCommand as V2TargetGroupsCommand,
  DescribeTargetHealthCommand as V2TargetHealthCommand,
  DescribeLoadBalancersCommandOutput as V2CommandOutput,
  DescribeTagsCommandOutput as V2TagsCommandOutput,
  DescribeTargetGroupsCommandOutput as V2TargetGroupsCommandOutput,
  DescribeTargetHealthCommandOutput as V2TargetHealthCommandOutput,
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
    const { loadBalancerNameByRegion, loadBalancerArnByRegion } = this.groupLoadBalancersByRegion(response)
    let promises: any[] = []
    // Get tags for network and application LBs
    Object.keys(loadBalancerNameByRegion).forEach((region) => {
      promises.push(this.getV3Client(region).send(this.getV3TagsCommand(loadBalancerNameByRegion[region])))
    })
    Object.keys(loadBalancerArnByRegion).forEach((region) => {
      promises.push(this.getV2Client(region).send(this.getV2TagsCommand(loadBalancerArnByRegion[region])))
    })
    // Get target groups for network and application LBs
    Object.keys(loadBalancerArnByRegion).forEach((region) => {
      promises.push(this.getV2Client(region).send(this.getV2TargetGroupsCommand()))
    })
    const tagsAndTargetGroupsResponse = await Promise.all(promises)
    const formattedTagsAndTargetGroupsResponse = this.formatTagsAndTargetGroupsResponse(tagsAndTargetGroupsResponse)

    const targetGroupsArnByRegion = this.groupTargetGroupArnsByRegion(loadBalancerArnByRegion, formattedTagsAndTargetGroupsResponse.loadBalancerArns)

    // Get target health for network and application LBs
    promises = []
    Object.keys(targetGroupsArnByRegion).forEach((region) => {
      targetGroupsArnByRegion[region].forEach((targetGroupArn: string) => {
        promises.push(targetGroupArn)
        promises.push(this.getV2Client(region).send(this.getV2TargetHealthCommand(targetGroupArn)))
      })
    })
    const targetHealthResponse = await Promise.all(promises)
    const formattedTargetHealthResponse = this.formatTargetHealthResponse(targetHealthResponse)

    // @ts-ignore
    response.items.map((elb: Elb) => {
      elb.nameTag = TagsHelper.getNameTagValue(formattedTagsAndTargetGroupsResponse.tags[elb.getIdentifierForNameTag()] ?? [])
      elb.tags = TagsHelper.formatTags(formattedTagsAndTargetGroupsResponse.tags[elb.getIdentifierForNameTag()] ?? [])
      if (elb.hasAttachments === undefined) {
        elb.hasAttachments = elb.loadBalancerArn in formattedTagsAndTargetGroupsResponse.loadBalancerArns &&
          formattedTagsAndTargetGroupsResponse.loadBalancerArns[elb.loadBalancerArn] in formattedTargetHealthResponse
      }
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
        !!lb.Instances?.length,
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
        undefined,
        TagsHelper.getNameTagValue([])
      ))
    })
    return data
  }

  private formatTagsAndTargetGroupsResponse (response: any[]): any {
    const data: any = {
      tags: {},
      loadBalancerArns: {}
    }
    response.forEach((r: V3TagsCommandOutput | V2TagsCommandOutput | V2TargetGroupsCommandOutput) => {
      if (this.instanceOfV2TargetGroupsCommandOutput(r)) {
        r.TargetGroups?.forEach((t) => {
          t.LoadBalancerArns?.forEach((l) => {
            data.loadBalancerArns[l] = t.TargetGroupArn
          })
        })
      } else {
        r.TagDescriptions?.forEach((t) => {
          if ('LoadBalancerName' in t && t.LoadBalancerName) {
            data.tags[t.LoadBalancerName] = t.Tags
          } else if ('ResourceArn' in t && t.ResourceArn) {
            data.tags[t.ResourceArn] = t.Tags
          }
        })
      }
    })
    return data
  }

  private formatTargetHealthResponse (response: any[]): any {
    const data: any = {}
    let instanceIdentifier: string
    response.forEach((r: V2TargetHealthCommandOutput | string) => {
      if (typeof r === 'string') {
        instanceIdentifier = r
        return
      }
      if (r.TargetHealthDescriptions?.length) {
        data[instanceIdentifier] = true
      }
    })
    return data
  }

  private groupLoadBalancersByRegion<Type> (response: Response<Type>): any {
    const data: any = {
      loadBalancerNameByRegion: {},
      loadBalancerArnByRegion: {}
    }
    // @ts-ignore
    response.items.forEach((elb: Elb) => {
      if (elb.type === 'classic') {
        if (!(elb.getRegion() in data.loadBalancerNameByRegion)) {
          data.loadBalancerNameByRegion[elb.getRegion()] = []
        }
        data.loadBalancerNameByRegion[elb.getRegion()].push(elb.loadBalancerName)
      } else {
        if (!(elb.getRegion() in data.loadBalancerArnByRegion)) {
          data.loadBalancerArnByRegion[elb.getRegion()] = []
        }
        data.loadBalancerArnByRegion[elb.getRegion()].push(elb.loadBalancerArn)
      }
    })
    return data
  }

  private groupTargetGroupArnsByRegion (loadBalancerArnByRegion: any, loadBalancerArn: any): any {
    const data: any = {}
    Object.keys(loadBalancerArnByRegion).forEach((region) => {
      loadBalancerArnByRegion[region].forEach((arn: string) => {
        if (!(region in data)) {
          data[region] = []
        }
        if (arn in loadBalancerArn) {
          data[region].push(loadBalancerArn[arn])
        }
      })
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

  private getV2TargetGroupsCommand (): V2TargetGroupsCommand {
    return new V2TargetGroupsCommand({})
  }

  private getV2TargetHealthCommand (arn: string): V2TargetHealthCommand {
    return new V2TargetHealthCommand({ TargetGroupArn: arn })
  }

  private instanceOfV3CommandOutput (data: any): data is V3CommandOutput {
    return 'LoadBalancerDescriptions' in data
  }

  private instanceOfV2TargetGroupsCommandOutput (data: any): data is V2TargetGroupsCommandOutput {
    return 'TargetGroups' in data
  }
}
