import {
  DeleteLoadBalancerCommand as V3DeleteCommand,
  DescribeLoadBalancersCommand as V3Command,
  DescribeTagsCommand as V3TagsCommand,
  DescribeLoadBalancersCommandOutput as V3CommandOutput,
  DescribeTagsCommandOutput as V3TagsCommandOutput,
  ElasticLoadBalancingClient as V3Client
} from '@aws-sdk/client-elastic-load-balancing'
import {
  DeleteLoadBalancerCommand as V2DeleteCommand,
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
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { CleanAwsElbMetadataInterface } from '../../../request/clean/clean-request-resource-metadata-interface'

export default class AwsElbClient extends AwsBaseClient implements AwsClientInterface {
  getCollectCommands (region: string): any[] {
    const commands = []
    commands.push(this.getV3Client(region).send(AwsElbClient.getV3Command()))
    commands.push(this.getV2Client(region).send(AwsElbClient.getV2Command()))
    return commands
  }

  getCleanCommands (request: CleanRequestResourceInterface): Promise<any> {
    const metadata = request.metadata as CleanAwsElbMetadataInterface
    if (metadata.type === 'classic') {
      return new Promise((resolve, reject) => {
        this.getV3Client(request.region).send(AwsElbClient.getV3DeleteCommand(request.id))
          .then(() => resolve(request.id))
          .catch((e) => reject(e.message))
      })
    } else {
      return new Promise((resolve, reject) => {
        this.getV2Client(request.region).send(AwsElbClient.getV2DeleteCommand(metadata.loadBalancerArn as string))
          .then(() => resolve(request.id))
          .catch((e) => reject(e.message))
      })
    }
  }

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean {
    if (!('metadata' in request) || !request.metadata) {
      return false
    }
    const metadata = request.metadata as CleanAwsElbMetadataInterface
    return metadata.type === 'classic' || (['network', 'application'].includes(metadata.type) && metadata.loadBalancerArn !== undefined)
  }

  async formatCollectResponse<Type> (response: V3CommandOutput[] | V2CommandOutput[]): Promise<Response<Type>> {
    let data: any[] = []
    response.forEach((res) => {
      if (AwsElbClient.instanceOfV3CommandOutput(res)) {
        data = [...data, ...this.formatV3Response(res)]
      } else {
        data = [...data, ...this.formatV2Response(res)]
      }
    })
    await this.awsPriceCalculator.putElbPrices(data)
    return new Response<Type>(data)
  }

  async getAdditionalDataForFormattedCollectResponse<Type> (response: Response<Type>): Promise<Response<Type>> {
    const { loadBalancerNameByRegion, loadBalancerArnByRegion } = this.groupLoadBalancersByRegion(response)
    let promises: any[] = []
    // Get tags for network and application LBs
    Object.keys(loadBalancerNameByRegion).forEach((region) => {
      // split into chunks
      for (let i = 0; i < loadBalancerNameByRegion[region].length; i += 20) {
        const chunk = loadBalancerNameByRegion[region].slice(i, i + 20)
        promises.push(this.getV3Client(region).send(AwsElbClient.getV3TagsCommand(chunk)))
      }
    })
    Object.keys(loadBalancerArnByRegion).forEach((region) => {
      // split into chunks
      for (let i = 0; i < loadBalancerArnByRegion[region].length; i += 20) {
        const chunk = loadBalancerArnByRegion[region].slice(i, i + 20)
        promises.push(this.getV2Client(region).send(AwsElbClient.getV2TagsCommand(chunk)))
      }
    })
    // Get target groups for network and application LBs
    Object.keys(loadBalancerArnByRegion).forEach((region) => {
      promises.push(this.getV2Client(region).send(AwsElbClient.getV2TargetGroupsCommand()))
    })
    const tagsAndTargetGroupsResponse = await Promise.all(promises)
    const formattedTagsAndTargetGroupsResponse = this.formatTagsAndTargetGroupsResponse(tagsAndTargetGroupsResponse)
    const targetGroupsArnByRegion = this.groupTargetGroupArnsByRegion(loadBalancerArnByRegion, formattedTagsAndTargetGroupsResponse.loadBalancerArns)

    // Get target health for network and application LBs
    promises = []
    Object.keys(targetGroupsArnByRegion).forEach((region) => {
      targetGroupsArnByRegion[region].forEach((targetGroupArn: string) => {
        promises.push(targetGroupArn)
        promises.push(this.getV2Client(region).send(AwsElbClient.getV2TargetHealthCommand(targetGroupArn)))
      })
    })
    const targetHealthResponse = await Promise.all(promises)
    const formattedTargetHealthResponse = this.formatTargetHealthResponse(targetHealthResponse)

    // @ts-ignore
    response.items.map((elb: Elb) => {
      elb.nameTag = TagsHelper.getNameTagValue(formattedTagsAndTargetGroupsResponse.tags[elb.getIdentifierForNameTag()] ?? [])
      elb.tags = TagsHelper.formatTags(formattedTagsAndTargetGroupsResponse.tags[elb.getIdentifierForNameTag()] ?? [])
      if (elb.hasAttachments === undefined) {
        let hasAttachments = false
        const arns = formattedTagsAndTargetGroupsResponse.loadBalancerArns[(elb.loadBalancerArn ?? '')] ?? []
        arns.forEach((arn: string) => {
          hasAttachments = hasAttachments || (arn in formattedTargetHealthResponse && formattedTargetHealthResponse[arn])
        })
        elb.hasAttachments = hasAttachments
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
        !!lb.Instances?.length,
        undefined,
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
        undefined,
        lb.LoadBalancerArn || '',
        lb.CreatedTime?.toISOString() || '',
        lb.Type || '',
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
      if (AwsElbClient.instanceOfV2TargetGroupsCommandOutput(r)) {
        r.TargetGroups?.forEach((t) => {
          t.LoadBalancerArns?.forEach((l) => {
            if (!data.loadBalancerArns[l]) {
              data.loadBalancerArns[l] = []
            }
            data.loadBalancerArns[l].push(t.TargetGroupArn)
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
      data[instanceIdentifier] = !!r.TargetHealthDescriptions?.length
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
          data[region] = [...data[region], ...loadBalancerArn[arn]]
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

  private static getV3Command (): V3Command {
    return new V3Command({})
  }

  private static getV3TagsCommand (loadBalancerNames: string[]): V3TagsCommand {
    return new V3TagsCommand({ LoadBalancerNames: loadBalancerNames })
  }

  private static getV3DeleteCommand (loadBalancerName: string): V3DeleteCommand {
    return new V3DeleteCommand({ LoadBalancerName: loadBalancerName })
  }

  private static getV2Command (): V2Command {
    return new V2Command({})
  }

  private static getV2TagsCommand (resourceArns: string[]): V2TagsCommand {
    return new V2TagsCommand({ ResourceArns: resourceArns })
  }

  private static getV2DeleteCommand (loadBalancerArn: string): V2DeleteCommand {
    return new V2DeleteCommand({ LoadBalancerArn: loadBalancerArn })
  }

  private static getV2TargetGroupsCommand (): V2TargetGroupsCommand {
    return new V2TargetGroupsCommand({})
  }

  private static getV2TargetHealthCommand (arn: string): V2TargetHealthCommand {
    return new V2TargetHealthCommand({ TargetGroupArn: arn })
  }

  private static instanceOfV3CommandOutput (data: any): data is V3CommandOutput {
    return 'LoadBalancerDescriptions' in data
  }

  private static instanceOfV2TargetGroupsCommandOutput (data: any): data is V2TargetGroupsCommandOutput {
    return 'TargetGroups' in data
  }
}
