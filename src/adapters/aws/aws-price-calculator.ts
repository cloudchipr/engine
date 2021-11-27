import AwsPricingClient from './aws-pricing-client'
import { Ec2 } from '../../domain/types/aws/ec2'
import AwsEc2Client from './aws-ec2-client'
import { Eip } from '../../domain/types/aws/eip'
import { Ebs } from '../../domain/types/aws/ebs'
import { Rds } from '../../domain/types/aws/rds'
import { Alb } from '../../domain/types/aws/alb'
import { Elb } from '../../domain/types/aws/elb'
import { Nlb } from '../../domain/types/aws/nlb'
import { CredentialProvider } from '@aws-sdk/types'

export default class AwsPriceCalculator {
  private readonly client: AwsPricingClient
  private readonly ec2Client: AwsEc2Client

  private static EC2_PLATFORM_DETAILS_TO_PRICING_NAMES = new Map([
    ['SUSE Linux', 'SUSE'],
    ['Linux/UNIX', 'Linux'],
    ['Red Hat BYOL Linux', 'RHEL'],
    ['Red Hat Enterprise Linux', 'RHEL'],
    ['Red Hat Enterprise Linux with HA', '"Red Hat Enterprise Linux with HA'],
    ['Windows', 'Windows'],
    ['Windows BYOL', 'Windows'],
    ['Windows with SQL Server Enterprise *', 'Windows'],
    ['Windows with SQL Server Standard *', 'Windows'],
    ['Windows with SQL Server Web *', 'Windows']
  ])

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

  private static REGION_CODES_TO_SHORT_FORM_PRICING_NAMES = new Map([
    ['us-east-1', 'USE1'],
    ['us-east-2', 'USE2'],
    ['us-west-1', 'USW1'],
    ['us-west-2', 'USW2'],
    ['af-south-1', 'AFS1'],
    ['ap-east-1', 'APE1'],
    ['ap-south-1', 'APS1'],
    ['ap-northeast-1', 'APN1'],
    ['ap-northeast-2', 'APN2'],
    ['ap-northeast-3', 'APN3'],
    ['ap-southeast-1', 'APS1'],
    ['ap-southeast-2', 'APS2'],
    ['ca-central-1', 'CAN1'],
    ['cn-north-1', 'China (Beijing)'], // @todo must be fixed, cannot find them now
    ['cn-northwest-1', 'China (Ningxia)'], // @todo must be fixed, cannot find them now
    ['eu-central-1', 'EUC1'],
    ['eu-west-1', 'EUW1'],
    ['eu-west-2', 'EUW2'],
    ['eu-west-3', 'EUW3'],
    ['eu-south-1', 'EUS1'],
    ['eu-north-1', 'EUN1'],
    ['me-south-1', 'MES1'],
    ['sa-east-1', 'SAE1']
  ]);

  private static REDS_DB_TYPES_TO_PRICING_NAMES = new Map([
    ['mysql', 'MySQL'],
    ['postgres', 'PostgreSQL']
  ])

  constructor (credentialProvider: CredentialProvider) {
    this.client = new AwsPricingClient(credentialProvider)
    this.ec2Client = new AwsEc2Client(credentialProvider)
  }

  async putElbPrices (elbItems: Elb[]): Promise<void> {
    if (!elbItems.length) {
      return
    }

    const filters: {
      [region: string]: {
        filter: {}[],
        elbItems: Set<Elb>
      }
    } = {}

    let loadBalancerFilterMethodName = 'getElbFilter'

    if (elbItems[0] instanceof Alb) {
      loadBalancerFilterMethodName = 'getAlbFilter'
    }

    if (elbItems[0] instanceof Nlb) {
      loadBalancerFilterMethodName = 'getNlbFilter'
    }

    // collect all unique filters
    for (const elb of elbItems) {
      const region = elb.getRegion()
      if (filters[region] === undefined) {
        filters[region] = {
          filter: (AwsPriceCalculator as any)[loadBalancerFilterMethodName](region),
          elbItems: new Set<Elb>()
        }
      }
      filters[region].elbItems.add(elb)
    }

    for (const regionKey of Object.keys(filters)) {
      const filter = filters[regionKey].filter
      const priceData = await this.client.getPrice('AWSELB', filter)

      const onDemand = priceData.terms.OnDemand
      const priceDimensions = onDemand[Object.keys(onDemand)[0]].priceDimensions
      const pricePerUnit = priceDimensions[Object.keys(priceDimensions)[0]].pricePerUnit

      const elbItems = filters[regionKey].elbItems
      elbItems.forEach(elb => {
        elb.pricePerHour = pricePerUnit.USD
        return elb
      })
    }
  }

  async putRdsPrices (rdsItems: Rds[]): Promise<void> {
    if (!rdsItems.length) {
      return
    }

    const filters: {
      [region: string]: {
        [instanceType: string]: {
            [dbType: string]: {
                [multiAZ: string]: {
                  filter: {}[],
                  rdsItems: Set<Rds>
              }
            }
          }
        }
      } = {}

    // collect all unique filters
    for (const rds of rdsItems) {
      const region = rds.getRegion()
      const multiAZFilterKey = rds.multiAZ ? 1 : 0
      if (filters[region] === undefined) filters[region] = {}
      if (filters[region][rds.instanceType] === undefined) filters[region][rds.instanceType] = {}
      if (filters[region][rds.instanceType][rds.dbType] === undefined) filters[region][rds.instanceType][rds.dbType] = {}
      if (filters[region][rds.instanceType][rds.dbType][multiAZFilterKey] === undefined) {
        filters[region][rds.instanceType][rds.dbType][multiAZFilterKey] = {
          filter: AwsPriceCalculator.getRdsFilter(region, rds.instanceType, rds.dbType, rds.multiAZ),
          rdsItems: new Set<Rds>()
        }
      }
      filters[region][rds.instanceType][rds.dbType][multiAZFilterKey].rdsItems.add(rds)
    }

    for (const regionKey of Object.keys(filters)) {
      for (const instanceTypeKey of Object.keys(filters[regionKey])) {
        for (const dbTypeKey of Object.keys(filters[regionKey][instanceTypeKey])) {
          for (const multiAZKey of Object.keys(filters[regionKey][instanceTypeKey][dbTypeKey])) {
            const filter = filters[regionKey][instanceTypeKey][dbTypeKey][multiAZKey].filter
            const priceData = await this.client.getPrice('AmazonRDS', filter)

            const onDemand = priceData.terms.OnDemand
            const priceDimensions = onDemand[Object.keys(onDemand)[0]].priceDimensions
            const pricePerUnit = priceDimensions[Object.keys(priceDimensions)[0]].pricePerUnit

            const rdsItems = filters[regionKey][instanceTypeKey][dbTypeKey][multiAZKey].rdsItems
            rdsItems.forEach(rds => {
              rds.pricePerHour = pricePerUnit.USD
              return rds
            })
          }
        }
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
          ebs.pricePerMonthGB = pricePerUnit.USD
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

    const regionToInstancesMap = new Map<string, string[]>()
    ec2Items.forEach(ec2 => {
      const region = ec2.getRegion()
      if (!regionToInstancesMap.has(region)) {
        regionToInstancesMap.set(region, [])
      }
      regionToInstancesMap.get(region)?.push(ec2.imageId)
    })

    const imageMap = new Map<string, { PlatformDetails: string, Platform: string, UsageOperation: string} >()
    const promises : Array<Promise<any>> = []
    regionToInstancesMap.forEach((imageIds, region) => {
      promises.push(this.ec2Client.describeImages(imageIds, region))
    })

    await Promise
      .all(promises)
      .then(result => {
        result.forEach(imagesData => {
          for (const imageData of imagesData.Images) {
            imageMap.set(imageData.ImageId, imageData)
          }
        })
      })

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

      const platform = AwsPriceCalculator.EC2_PLATFORM_DETAILS_TO_PRICING_NAMES.get(imageData.PlatformDetails)
      if (platform === undefined) {
        throw new Error(`EC2 price calculation, cannot find platform of the instance: ${ec2Item.id} with platform details ${imageData.PlatformDetails}`)
      }

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
            region, ec2Item.type, platform, usageOperation, tenancy
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

  private static getRdsFilter (region: string, instanceType: string, dbType: string, multiAZ: boolean): {}[] {
    return [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AmazonRDS'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'regionCode',
        Value: region
      },
      {
        Type: 'TERM_MATCH',
        Field: 'databaseEngine',
        Value: this.REDS_DB_TYPES_TO_PRICING_NAMES.get(dbType)
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

  private static getElbFilter (region: string): {}[] {
    const generalFilter = this.getLbGeneralFilter(region)
    generalFilter.push({
      Type: 'TERM_MATCH',
      Field: 'operation',
      Value: 'LoadBalancing'
    })

    return generalFilter
  }

  private static getNlbFilter (region: string): {}[] {
    const generalFilter = this.getLbGeneralFilter(region)
    generalFilter.push({
      Type: 'TERM_MATCH',
      Field: 'operation',
      Value: 'LoadBalancing:Network'
    })

    return generalFilter
  }

  private static getAlbFilter (region: string): {}[] {
    const generalFilter = this.getLbGeneralFilter(region)
    generalFilter.push({
      Type: 'TERM_MATCH',
      Field: 'operation',
      Value: 'LoadBalancing:Application'
    })

    return generalFilter
  }

  private static getLbGeneralFilter (region: string): {}[] {
    return [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AWSELB'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'regionCode',
        Value: region
      },
      {
        Type: 'TERM_MATCH',
        Field: 'locationType',
        Value: 'AWS Region'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'usagetype',
        Value: (region === 'us-east-1' ? '' : this.REGION_CODES_TO_SHORT_FORM_PRICING_NAMES.get(region) + '-') + 'LoadBalancerUsage'
      }
    ]
  }
}
