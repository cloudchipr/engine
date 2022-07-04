import { Ec2 } from '../../domain/types/aws/ec2'
import { Eip } from '../../domain/types/aws/eip'
import { Ebs } from '../../domain/types/aws/ebs'
import { Rds } from '../../domain/types/aws/rds'
import { Elb } from '../../domain/types/aws/elb'
import { CredentialProvider } from '@aws-sdk/types'
import {
  DescribeSpotPriceHistoryCommand,
  EC2Client
} from '@aws-sdk/client-ec2'
import { PricingInterface } from '../pricing-interface'
import { AwsPricingListType } from '../../domain/types/common/pricing-list-type'
import { Response } from '../../responses/response'
import { Pricing } from '@aws-sdk/client-pricing/dist-types/Pricing'
import * as AWS from '@aws-sdk/client-pricing'
import { GetProductsCommandInput } from '@aws-sdk/client-pricing/dist-types/commands/GetProductsCommand'
import { AwsSubCommand } from '../../aws-sub-command'
import AwsPriceCalculator from './aws-price-calculator'

export class AwsPricing implements PricingInterface {
  private readonly client: Pricing;
  private readonly credentialProvider: CredentialProvider

  constructor (credentialProvider: CredentialProvider) {
    // @todo make region dynamic between us-east-1, ap-south-1 (these are the only possible options)
    this.client = new AWS.Pricing({
      region: 'us-east-1',
      credentials: credentialProvider
    })
    this.credentialProvider = credentialProvider
  }

  async getPricingList (resources: Response<Ebs | Ec2 | Eip | Rds | Elb>[]): Promise<AwsPricingListType> {
    let result: AwsPricingListType = {}
    try {
      const promises: any[] = []
      resources.forEach((resource) => {
        if (resource.count === 0) {
          return
        }
        const subCommand = resource.items[0].constructor.name.toLowerCase()
        const pricingListMethodName = AwsPricing.getPricingMethodName(subCommand)
        promises.push((this as any)[pricingListMethodName](resource.items))
      })
      const response = await Promise.all(promises)
      result = Object.assign({}, ...response)
    } catch (e: any) {}
    return result
  }

  private static getPricingMethodName (subCommand: string): string {
    switch (subCommand) {
      case AwsSubCommand.EBS_SUBCOMMAND:
        return 'getEbsPricingList'
      case AwsSubCommand.EC2_SUBCOMMAND:
        return 'getEc2PricingList'
      case AwsSubCommand.EIP_SUBCOMMAND:
        return 'getEipPricingList'
      case AwsSubCommand.RDS_SUBCOMMAND:
        return 'getRdsPricingList'
      case AwsSubCommand.ELB_SUBCOMMAND:
      case AwsSubCommand.NLB_SUBCOMMAND:
      case AwsSubCommand.ALB_SUBCOMMAND:
        return 'getElbPricingList'
      default:
        return ''
    }
  }

  private async getEbsPricingList (items: Ebs[]): Promise<AwsPricingListType> {
    let result: AwsPricingListType = {}
    const filters: any = {}
    items.forEach((item) => {
      const key = item.getRegion().concat('_', item.type)
      if (filters[key] === undefined) {
        filters[key] = AwsPricing.getEbsFilter(item.getRegion(), item.type)
      }
    })
    const promises: any[] = []
    for (const key of Object.keys(filters)) {
      promises.push(this.getPricingListByFilter('AmazonEC2', filters[key]))
    }
    const response = await Promise.all(promises)
    response.forEach((it: any) => {
      result = { ...result, ...AwsPricing.mapEbsProduct(JSON.parse(it)) }
    })
    return result
  }

  private async getEc2PricingList (items: Ec2[]): Promise<AwsPricingListType> {
    let result: AwsPricingListType = {}
    const filters: any = {}
    const spotInstancesFilters: any = {}
    items.forEach((item) => {
      const platform = AwsPriceCalculator.EC2_PLATFORM_DETAILS_TO_PRICING_NAMES.get(item.platformDetails)
      if (platform === undefined) {
        return
      }
      if (item.isSpotInstance) {
        const key = item.getRegion().concat('_', item.availabilityZone, '_', item.type, '_', item.platformDetails, '_1')
        if (spotInstancesFilters[key] === undefined) {
          spotInstancesFilters[key] = AwsPricing.getEc2SpotInstanceFilter(item.getRegion(), item.availabilityZone, item.type, item.platformDetails)
        }
      } else {
        const tenancy = !item.tenancy || item.tenancy === 'default' ? 'Shared' : item.tenancy
        const key = item.getRegion().concat('_', item.type, '_', platform, '_', item.usageOperation, '_', tenancy, '_0')
        if (filters[key] === undefined) {
          filters[key] = AwsPricing.getEc2Filter(item.getRegion(), item.type, platform, item.usageOperation, tenancy)
        }
      }
    })
    const promises: any[] = []
    for (const key of Object.keys(filters)) {
      promises.push(this.getPricingListByFilter('AmazonEC2', filters[key]))
    }
    for (const key of Object.keys(spotInstancesFilters)) {
      promises.push(this.getSpotInstancePrice(spotInstancesFilters[key].region, spotInstancesFilters[key].availabilityZone, spotInstancesFilters[key].instanceType, spotInstancesFilters[key].productDescription))
    }
    const response = await Promise.all(promises)
    response.forEach((it: any) => {
      result = { ...result, ...AwsPricing.mapEc2Product((typeof it === 'string' || it instanceof String) ? JSON.parse(it as string) : it) }
    })
    return result
  }

  private async getEipPricingList (items: Eip[]): Promise<AwsPricingListType> {
    let result: AwsPricingListType = {}
    const filters: any = {}
    items.forEach((item) => {
      if (filters[item.getRegion()] === undefined) {
        filters[item.getRegion()] = AwsPricing.getEipFilter(item.getRegion())
      }
    })
    const promises: any[] = []
    for (const key of Object.keys(filters)) {
      promises.push(this.getPricingListByFilter('AmazonEC2', filters[key]))
    }
    const response = await Promise.all(promises)
    response.forEach((it: any) => {
      result = { ...result, ...AwsPricing.mapEipProduct(JSON.parse(it)) }
    })
    return result
  }

  private async getRdsPricingList (items: Rds[]): Promise<AwsPricingListType> {
    let result: AwsPricingListType = {}
    const filters: any = {}
    items.forEach((item) => {
      const key = item.getRegion().concat('_', item.instanceType, '_', item.dbType, '_', item.multiAZ ? '1' : '0')
      if (filters[key] === undefined) {
        filters[key] = AwsPricing.getRdsFilter(item.getRegion(), item.instanceType, item.dbType, item.multiAZ)
      }
    })
    const promises: any[] = []
    for (const key of Object.keys(filters)) {
      promises.push(this.getPricingListByFilter('AmazonRDS', filters[key]))
    }
    const response = await Promise.all(promises)
    response.forEach((it: any) => {
      result = { ...result, ...AwsPricing.mapRdsProduct(JSON.parse(it)) }
    })
    return result
  }

  private async getElbPricingList (items: Elb[]): Promise<AwsPricingListType> {
    let result: AwsPricingListType = {}
    const filters: any = {}
    items.forEach((item) => {
      const key = item.getRegion().concat('_', item.type || '')
      if (filters[key] === undefined) {
        filters[key] = AwsPricing.getLbFilter(item.getRegion(), item.type || '')
      }
    })
    const promises: any[] = []
    for (const key of Object.keys(filters)) {
      promises.push(this.getPricingListByFilter('AWSELB', filters[key]))
    }
    const response = await Promise.all(promises)
    response.forEach((it: any) => {
      result = { ...result, ...AwsPricing.mapLbProduct(JSON.parse(it)) }
    })
    return result
  }

  private async getPricingListByFilter (service: string, filter: {}): Promise<any[]> {
    const params = {
      ServiceCode: service,
      Filters: filter,
      FormatVersion: 'aws_v1',
      MaxResults: 100
    } as GetProductsCommandInput
    let data: any[] = []
    while (true) {
      const result = await this.client.getProducts(params)
      data = data.concat(result.PriceList)
      if (result.NextToken != null) {
        params.NextToken = result.NextToken
      } else {
        break
      }
    }
    return data
  }

  private async getSpotInstancePrice (region: string, availabilityZone: string, instanceType: string, productDescription: string): Promise<any> {
    try {
      const command = new DescribeSpotPriceHistoryCommand({
        AvailabilityZone: availabilityZone,
        InstanceTypes: [instanceType],
        ProductDescriptions: [productDescription],
        StartTime: new Date()
      })
      const ec2Client = new EC2Client({ credentials: this.credentialProvider, region })
      return await ec2Client.send(command)
    } catch (error) {}
  }

  private static mapEbsProduct (it: any): AwsPricingListType {
    const priceDimensions = (Object.values(it.terms?.OnDemand ?? {})[0] as any)?.priceDimensions
    const price = (Object.values(priceDimensions ?? {})[0] as any)?.pricePerUnit ?? {}
    const key = AwsSubCommand.EBS_SUBCOMMAND.concat(
      '_' + it.product?.attributes?.regionCode as unknown as string,
      '_' + it.product?.attributes?.volumeType as unknown as string
    )
    return AwsPricing.mapProduct(key, price)
  }

  private static mapEc2Product (it: any): AwsPricingListType {
    if (it.SpotPriceHistory !== undefined) {
      const price = {
        USD: it.SpotPriceHistory[0]?.SpotPrice as unknown as string
      }
      const key = AwsSubCommand.EC2_SUBCOMMAND.concat(
        '_' + it.SpotPriceHistory[0]?.AvailabilityZone as unknown as string,
        '_' + it.SpotPriceHistory[0]?.InstanceType as unknown as string,
        '_' + it.SpotPriceHistory[0]?.ProductDescription as unknown as string,
        '_1' // is spot instance
      )
      return AwsPricing.mapProduct(key, price)
    } else {
      const priceDimensions = (Object.values(it.terms?.OnDemand ?? {})[0] as any)?.priceDimensions
      const price = (Object.values(priceDimensions ?? {})[0] as any)?.pricePerUnit ?? {}
      const key = AwsSubCommand.EC2_SUBCOMMAND.concat(
        '_' + it.product?.attributes?.regionCode as unknown as string,
        '_' + it.product?.attributes?.instanceType as unknown as string,
        '_' + it.product?.attributes?.operatingSystem as unknown as string,
        '_' + it.product?.attributes?.operation as unknown as string,
        '_' + it.product?.attributes?.tenancy as unknown as string,
        '_0' // is not spot instance
      )
      return AwsPricing.mapProduct(key, price)
    }
  }

  private static mapEipProduct (it: any): AwsPricingListType {
    let price = {}
    const priceDimensions = (Object.values(it.terms?.OnDemand ?? {})[0] as any)?.priceDimensions ?? {}
    for (const key of Object.keys(priceDimensions)) {
      const item = priceDimensions[key]
      if (item.endRange === 'Inf') {
        price = item.pricePerUnit ?? {}
      }
    }
    const key = AwsSubCommand.EIP_SUBCOMMAND.concat(
      '_' + it.product?.attributes?.regionCode as unknown as string
    )
    return AwsPricing.mapProduct(key, price)
  }

  private static mapRdsProduct (it: any): AwsPricingListType {
    const priceDimensions = (Object.values(it.terms?.OnDemand ?? {})[0] as any)?.priceDimensions
    const price = (Object.values(priceDimensions ?? {})[0] as any)?.pricePerUnit ?? {}
    const key = AwsSubCommand.RDS_SUBCOMMAND.concat(
      '_' + it.product?.attributes?.regionCode as unknown as string,
      '_' + it.product?.attributes?.instanceType as unknown as string,
      '_' + it.product?.attributes?.databaseEngine as unknown as string,
      '_' + (it.product?.attributes?.deploymentOption?.toLowerCase() as unknown as string === 'single-az' ? '0' : '1')
    )
    return AwsPricing.mapProduct(key, price)
  }

  private static mapLbProduct (it: any): AwsPricingListType {
    const priceDimensions = (Object.values(it.terms?.OnDemand ?? {})[0] as any)?.priceDimensions
    const price = (Object.values(priceDimensions ?? {})[0] as any)?.pricePerUnit ?? {}
    const key = AwsSubCommand.ELB_SUBCOMMAND.concat(
      '_' + it.product?.attributes?.regionCode as unknown as string,
      '_' + it.product?.attributes?.operation as unknown as string
    )
    return AwsPricing.mapProduct(key, price)
  }

  private static mapProduct (key: string, price: {}): AwsPricingListType {
    return {
      [key.replace(/ /g, '')]: {
        price: parseFloat(Object.values(price)[0] as unknown as string),
        currency: Object.keys(price)[0] as unknown as string
      }
    }
  }

  private static getRdsFilter (region: string, instanceType: string, dbType: string, multiAZ: boolean): {}[] {
    return [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AmazonRDS'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'location',
        Value: AwsPriceCalculator.REGION_CODES_TO_PRICING_NAMES.get(region)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'databaseEngine',
        Value: AwsPriceCalculator.REDS_DB_TYPES_TO_PRICING_NAMES.get(dbType)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'instanceType',
        Value: instanceType
      },
      {
        Type: 'TERM_MATCH',
        Field: 'deploymentOption',
        Value: multiAZ ? 'Multi-AZ' : 'Single-AZ'
      }
    ]
  }

  private static getEbsFilter (region: string, volumeType: string): {}[] {
    return [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AmazonEC2'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'productFamily',
        Value: 'Storage'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'location',
        Value: AwsPriceCalculator.REGION_CODES_TO_PRICING_NAMES.get(region)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'volumeType',
        Value: AwsPriceCalculator.EBS_TO_PRICING_NAMES.get(volumeType)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'volumeApiName',
        Value: volumeType
      }
    ]
  }

  private static getEipFilter (region: string): {}[] {
    return [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AmazonEC2'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'productFamily',
        Value: 'IP Address'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'location',
        Value: AwsPriceCalculator.REGION_CODES_TO_PRICING_NAMES.get(region)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'group',
        Value: 'ElasticIP:Address'
      }
    ]
  }

  private static getEc2Filter (region: string, instanceType: string, operatingSystem: string, operation: string, tenancy: string): {}[] {
    return [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AmazonEC2'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'instanceType',
        Value: instanceType
      },
      {
        Type: 'TERM_MATCH',
        Field: 'operatingSystem',
        Value: operatingSystem
      },
      {
        Type: 'TERM_MATCH',
        Field: 'operation',
        Value: operation
      },
      {
        Type: 'TERM_MATCH',
        Field: 'tenancy',
        Value: tenancy
      },
      {
        Type: 'TERM_MATCH',
        Field: 'location',
        Value: AwsPriceCalculator.REGION_CODES_TO_PRICING_NAMES.get(region)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'capacitystatus',
        Value: 'Used'
      }
    ]
  }

  private static getEc2SpotInstanceFilter (region: string, availabilityZone: string, instanceType: string, productDescription: string): {} {
    return {
      region,
      availabilityZone,
      instanceType,
      productDescription
    }
  }

  private static getLbFilter (region: string, type: string): {}[] {
    return [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AWSELB'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'location',
        Value: AwsPriceCalculator.REGION_CODES_TO_PRICING_NAMES.get(region)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'locationType',
        Value: 'AWS Region'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'usagetype',
        Value: (region === 'us-east-1' ? '' : AwsPriceCalculator.REGION_CODES_TO_SHORT_FORM_PRICING_NAMES.get(region) + '-') + 'LoadBalancerUsage'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'operation',
        Value: AwsPriceCalculator.LB_TYPES_TO_PRICING_NAMES.get(type)
      }
    ]
  }
}
