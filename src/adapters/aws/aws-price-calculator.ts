import AwsPricingClient from './aws-pricing-client'
import { Ec2 } from '../../domain/types/aws/ec2'
import AwsEc2Client from './aws-ec2-client'
import { Configuration } from '../../configuration'
import { Eip } from '../../domain/types/aws/eip'
import { Ebs } from '../../domain/types/aws/ebs'
import { Rds } from '../../domain/types/aws/rds'

export default class AwsPriceCalculator {
  private readonly client: AwsPricingClient
  private readonly ec2Client: AwsEc2Client

   private static EBS_TO_PRICING_NAMES = new Map([
     ['standard', 'Magnetic'],
     ['gp2', 'General Purpose'],
     ['gp3', 'General Purpose'],
     ['io1', 'Provisioned IOPS'],
     ['st1', 'Throughput Optimized HDD'],
     ['sc1', 'Cold HDD']
   ])

  private static REGION_CODES_TO_PRICING_NAMES = new Map([
    ['us-east-2', 'US East (Ohio)'],
    ['us-east-1', 'US East (N. Virginia)'],
    ['us-west-1', 'US West (N. California)'],
    ['us-west-2', 'US West (Oregon)'],
    ['af-south-1', 'Africa (Cape Town)'],
    ['ap-east-1', 'Asia Pacific (Hong Kong)'],
    ['ap-south-1', 'Asia Pacific (Mumbai)'],
    ['ap-northeast-3', 'Asia Pacific (Osaka)'],
    ['ap-northeast-2', 'Asia Pacific (Seoul)'],
    ['ap-southeast-1', 'Asia Pacific (Singapore)'],
    ['ap-southeast-2', 'Asia Pacific (Sydney)'],
    ['ap-northeast-1', 'Asia Pacific (Tokyo)'],
    ['ca-central-1', 'Canada (Central)'],
    ['cn-north-1', 'China (Beijing)'],
    ['cn-northwest-1', 'China (Ningxia)'],
    ['eu-central-1', 'EU (Frankfurt)'],
    ['eu-west-1', 'EU (Ireland)'],
    ['eu-west-2', 'EU (London)'],
    ['eu-south-1', 'EU (Milan)'],
    ['eu-west-3', 'EU (Paris)'],
    ['eu-north-1', 'EU (Stockholm)'],
    ['me-south-1', 'Middle East (Bahrain)'],
    ['sa-east-1', 'South America (São Paulo)']
  ]);

  constructor (config: Configuration) {
    // @todo: update prising region 'us-east-1', and use ap-south-1 for Asia Pacific
    this.client = new AwsPricingClient('us-east-1', config.accessKeyId, config.secretAccessKey)
    this.ec2Client = new AwsEc2Client(config.region, config.accessKeyId, config.secretAccessKey)
  }

  async putRdsPrices (rdsItems: Rds[]): Promise<void> {
    if (!rdsItems.length) {
      return
    }
    const filters: {
      [region: string]: {
        [volumeType: string]: {
            filter: {}[],
            rdsItems: Set<Rds>
          }
        }
      } = {}

    // collect all unique filters
    for (const rds of rdsItems) {
      const region = rds.getRegion()
      if (filters[region] === undefined) filters[region] = {}
      if (filters[region][rds.storageType] === undefined) {
        filters[region][rds.storageType] = {
          filter: AwsPriceCalculator.getRdsFilter(region, rds.storageType),
          rdsItems: new Set<Rds>()
        }
      }
      filters[region][rds.storageType].rdsItems.add(rds)
    }

    for (const regionKey of Object.keys(filters)) {
      for (const volumeTypeKey of Object.keys(filters[regionKey])) {
        const filter = filters[regionKey][volumeTypeKey].filter
        const priceData = await this.client.getPrice('AmazonRDS', filter)

        const onDemand = priceData.terms.OnDemand
        const priceDimensions = onDemand[Object.keys(onDemand)[0]].priceDimensions
        const pricePerUnit = priceDimensions[Object.keys(priceDimensions)[0]].pricePerUnit

        const rdsItems = filters[regionKey][volumeTypeKey].rdsItems
        rdsItems.forEach(rds => {
          rds.pricePerMonthGB = pricePerUnit.USD
          return rds
        })
      }
    }
  }

  async putEbsPrices (ebsItems: Ebs[]): Promise<void> {
    if (!ebsItems.length) {
      return
    }
    const filters: {
      [region: string]: {
        [volumeType: string]: {
            filter: {}[],
            ebsItems: Set<Ebs>
          }
        }
      } = {}

    // collect all unique filters
    for (const ebs of ebsItems) {
      const region = ebs.getRegion()
      if (filters[region] === undefined) filters[region] = {}
      if (filters[region][ebs.type] === undefined) {
        filters[region][ebs.type] = {
          filter: AwsPriceCalculator.getEbsFilter(region, ebs.type),
          ebsItems: new Set<Ebs>()
        }
      }
      filters[region][ebs.type].ebsItems.add(ebs)
    }

    for (const regionKey of Object.keys(filters)) {
      for (const volumeTypeKey of Object.keys(filters[regionKey])) {
        const filter = filters[regionKey][volumeTypeKey].filter
        const priceData = await this.client.getPrice('AmazonEC2', filter)

        const onDemand = priceData.terms.OnDemand
        const priceDimensions = onDemand[Object.keys(onDemand)[0]].priceDimensions
        const pricePerUnit = priceDimensions[Object.keys(priceDimensions)[0]].pricePerUnit

        const ebsItems = filters[regionKey][volumeTypeKey].ebsItems
        ebsItems.forEach(ebs => {
          ebs.pricePerHour = pricePerUnit.USD
          return ebs
        })
      }
    }
  }

  async putEipPrices (eipItems: Eip[]): Promise<void> {
    if (!eipItems.length) {
      return
    }

    const filters: {
      [region: string]: {
        filter: {}[],
        eipItems: Set<Eip>
      }
    } = {}

    // collect all unique filters
    for (const eip of eipItems) {
      if (filters[eip.region] === undefined) {
        filters[eip.region] = {
          filter: AwsPriceCalculator.getEipFilter(eip.region),
          eipItems: new Set<Eip>()
        }
      }
      filters[eip.region].eipItems.add(eip)
    }

    for (const regionKey of Object.keys(filters)) {
      const filter = filters[regionKey].filter
      const priceData = await this.client.getPrice('AmazonEC2', filter)

      const onDemand = priceData.terms.OnDemand
      const priceDimensions = onDemand[Object.keys(onDemand)[0]].priceDimensions

      let priceFound: boolean = false
      for (const priceDimensionItemKey of Object.keys(priceDimensions)) {
        const priceDimensionItem = priceDimensions[priceDimensionItemKey]
        if (priceDimensionItem.endRange === 'Inf') {
          const pricePerUnit = priceDimensionItem.pricePerUnit
          eipItems.forEach(eip => {
            eip.pricePerHour = pricePerUnit.USD
            return eip
          })
          priceFound = true
          break
        }
      }

      if (!priceFound) {
        console.error('Cannot find eip price per unit: with endRange:Inf filter in ' + regionKey)
      }
    }
  }

  async putEc2Prices (ec2Items: Ec2[]): Promise<void> {
    if (!ec2Items.length) {
      return
    }

    const uniqueImageIds = Array.from(new Set(ec2Items.map(p => p.imageId)))
    let imagesData = await this.ec2Client.describeImages(uniqueImageIds)
    imagesData = imagesData.Images

    const imageMap = new Map<string, { Platform: string, UsageOperation: string} >()
    for (const imageData of imagesData) {
      imageMap.set(imageData.ImageId, imageData)
    }

    const filters: {
        [region: string]: {
            [instanceType: string]: {
                [platform: string]: {
                    [usageOperation: string]: {
                        [tenancy: string]: {
                            filter: {}[],
                            ec2Items: Set<Ec2>
                        }
                    }
                }
            }
        }
      } = {}

    for (const ec2Item of ec2Items) {
      const imageData = imageMap.get(ec2Item.imageId)
      if (imageData === undefined) {
        console.error('Cannot get image details, from map')
        continue
      }

      const platform = imageData.Platform ?? 'linux'
      const usageOperation = imageData.UsageOperation
      const tenancy = !ec2Item.tenancy || ec2Item.tenancy === 'default' ? 'Shared' : ec2Item.tenancy
      const region = ec2Item.getRegion()

      if (filters[region] === undefined) filters[region] = {}
      if (filters[region][ec2Item.type] === undefined) filters[region][ec2Item.type] = {}
      if (filters[region][ec2Item.type][platform] === undefined) filters[region][ec2Item.type][platform] = {}
      if (filters[region][ec2Item.type][platform][usageOperation] === undefined) filters[region][ec2Item.type][platform][usageOperation] = {}
      if (filters[region][ec2Item.type][platform][usageOperation][tenancy] === undefined) {
        filters[region][ec2Item.type][platform][usageOperation][tenancy] = {
          ec2Items: new Set<Ec2>(),
          filter: AwsPriceCalculator.getEc2Filter(
            'us-east-1', ec2Item.type, platform, usageOperation, tenancy
          )
        }
      }

      filters[region][ec2Item.type][platform][usageOperation][tenancy].ec2Items.add(ec2Item)
    }

    for (const regionKey of Object.keys(filters)) {
      for (const typeKey of Object.keys(filters[regionKey])) {
        for (const platformKey of Object.keys(filters[regionKey][typeKey])) {
          for (const usageOperationKey of Object.keys(filters[regionKey][typeKey][platformKey])) {
            for (const tenancyKey of Object.keys(filters[regionKey][typeKey][platformKey][usageOperationKey])) {
              const filter = filters[regionKey][typeKey][platformKey][usageOperationKey][tenancyKey].filter
              const priceData = await this.client.getPrice('AmazonEC2', filter)
              const onDemand = priceData.terms.OnDemand
              const priceDimensions = onDemand[Object.keys(onDemand)[0]].priceDimensions
              const pricePerUnit = priceDimensions[Object.keys(priceDimensions)[0]].pricePerUnit

              const ec2Items = filters[regionKey][typeKey][platformKey][usageOperationKey][tenancyKey].ec2Items
              ec2Items.forEach(ec2 => {
                ec2.pricePerHour = pricePerUnit.USD
                return ec2
              })
            }
          }
        }
      }
    }
  }

  private static getRdsFilter (region: string, storageType: string): {}[] {
    return [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AmazonRDS'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'location',
        Value: this.REGION_CODES_TO_PRICING_NAMES.get(region)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'volumeName',
        Value: storageType
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
        Value: this.REGION_CODES_TO_PRICING_NAMES.get(region)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'volumeType',
        Value: this.EBS_TO_PRICING_NAMES.get(volumeType)
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
        Value: this.REGION_CODES_TO_PRICING_NAMES.get(region)
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
        Value: this.REGION_CODES_TO_PRICING_NAMES.get(region)
      },
      {
        Type: 'TERM_MATCH',
        Field: 'capacitystatus',
        Value: 'Used'
      }
    ]
  }
}
