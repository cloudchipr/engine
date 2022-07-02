import { Ec2 } from '../../domain/types/aws/ec2'
import { Eip } from '../../domain/types/aws/eip'
import { Ebs } from '../../domain/types/aws/ebs'
import { Rds } from '../../domain/types/aws/rds'
import { Elb } from '../../domain/types/aws/elb'
import { CurrencyConverter } from '../currency-converter'
import { AwsCatalogClient } from './clients/aws-catalog-client'
import { AwsSubCommand } from '../../aws-sub-command'
import { Response } from '../../responses/response'
import { CredentialProvider } from '@aws-sdk/types'

export default class AwsPriceCalculator {
  public static EC2_PLATFORM_DETAILS_TO_PRICING_NAMES = new Map([
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

  public static EBS_TO_PRICING_NAMES = new Map([
    ['standard', 'Magnetic'],
    ['gp2', 'General Purpose'],
    ['gp3', 'General Purpose'],
    ['io1', 'Provisioned IOPS'],
    ['st1', 'Throughput Optimized HDD'],
    ['sc1', 'Cold HDD']
  ])

  public static REGION_CODES_TO_PRICING_NAMES = new Map([
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

  public static REGION_CODES_TO_SHORT_FORM_PRICING_NAMES = new Map([
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

  public static REDS_DB_TYPES_TO_PRICING_NAMES = new Map([
    ['mysql', 'MySQL'],
    ['postgres', 'PostgreSQL'],
    ['mariadb', 'MariaDB'],
    ['oracle-ee', 'Oracle'],
    ['oracle-ee-cdb', 'Oracle'],
    ['oracle-se2', 'Oracle'],
    ['oracle-se2-cdb', 'Oracle'],
    ['sqlserver-web', 'SQL Server'],
    ['sqlserver-ex', 'SQL Server'],
    ['sqlserver-se', 'SQL Server'],
    ['sqlserver-ee', 'SQL Server'],
    ['aurora-postgresql', 'Aurora PostgreSQL'],
    ['aurora-mysql', 'Aurora MySQL'],
    ['aurora', 'Aurora MySQL']
  ])

  public static LB_TYPES_TO_PRICING_NAMES = new Map([
    ['network', 'LoadBalancing:Network'],
    ['application', 'LoadBalancing:Application'],
    ['classic', 'LoadBalancing']
  ])

  static async putElbPrices (accountId: string, response: Response<Elb>[], credentialProvider: CredentialProvider): Promise<void> {
    await AwsCatalogClient.collectAllPricingLists(accountId, response, credentialProvider)
    response.forEach((res) => {
      res.items.map((item) => {
        const key = AwsPriceCalculator.getItemUniqueKey(AwsSubCommand.ELB_SUBCOMMAND, item)
        const data = AwsCatalogClient.PRISING_LIST[key]
        if (data !== undefined) {
          const price = CurrencyConverter.convertToUSD(data.currency, data.price)
          item.pricePerMonth = price * 720
        }
        return item
      })
    })
  }

  static async putRdsPrices (accountId: string, response: Response<Rds>[], credentialProvider: CredentialProvider): Promise<void> {
    await AwsCatalogClient.collectAllPricingLists(accountId, response, credentialProvider)
    response.forEach((res) => {
      res.items.map((item) => {
        const key = AwsPriceCalculator.getItemUniqueKey(AwsSubCommand.RDS_SUBCOMMAND, item)
        const data = AwsCatalogClient.PRISING_LIST[key]
        if (data !== undefined) {
          const price = CurrencyConverter.convertToUSD(data.currency, data.price)
          item.pricePerMonth = price * 720
        }
        return item
      })
    })
  }

  static async putEbsPrices (accountId: string, response: Response<Ebs>[], credentialProvider: CredentialProvider): Promise<void> {
    await AwsCatalogClient.collectAllPricingLists(accountId, response, credentialProvider)
    response.forEach((res) => {
      res.items.map((item) => {
        const key = AwsPriceCalculator.getItemUniqueKey(AwsSubCommand.EBS_SUBCOMMAND, item)
        const data = AwsCatalogClient.PRISING_LIST[key]
        if (data !== undefined) {
          const price = CurrencyConverter.convertToUSD(data.currency, data.price)
          item.pricePerMonth = price * item.size
        }
        return item
      })
    })
  }

  static async putEipPrices (accountId: string, response: Response<Eip>[], credentialProvider: CredentialProvider): Promise<void> {
    await AwsCatalogClient.collectAllPricingLists(accountId, response, credentialProvider)
    response.forEach((res) => {
      res.items.map((item) => {
        const key = AwsPriceCalculator.getItemUniqueKey(AwsSubCommand.EIP_SUBCOMMAND, item)
        const data = AwsCatalogClient.PRISING_LIST[key]
        if (data !== undefined) {
          const price = CurrencyConverter.convertToUSD(data.currency, data.price)
          item.pricePerMonth = price * 720
        }
        return item
      })
    })
  }

  static async putEc2Prices (accountId: string, response: Response<Ec2>[], credentialProvider: CredentialProvider): Promise<void> {
    await AwsCatalogClient.collectAllPricingLists(accountId, response, credentialProvider)
    response.forEach((res) => {
      res.items.map((item) => {
        const key = AwsPriceCalculator.getItemUniqueKey(AwsSubCommand.EC2_SUBCOMMAND, item)
        const data = AwsCatalogClient.PRISING_LIST[key]
        if (data !== undefined) {
          const price = CurrencyConverter.convertToUSD(data.currency, data.price)
          item.pricePerMonth = price * 720
        }
        return item
      })
    })
  }

  static getItemUniqueKey (subCommand: string, item: Ebs | Ec2 | Eip | Rds | Elb): string {
    switch (subCommand) {
      case AwsSubCommand.EBS_SUBCOMMAND:
        return AwsSubCommand.EBS_SUBCOMMAND.concat(
          '_' + item.getRegion(),
          '_' + AwsPriceCalculator.EBS_TO_PRICING_NAMES.get((item as Ebs).type)
        ).replace(/ /g, '')
      case AwsSubCommand.EC2_SUBCOMMAND:
        return AwsSubCommand.EC2_SUBCOMMAND.concat(
          '_' + item.getRegion(),
          '_' + (item as Ec2).type,
          '_' + AwsPriceCalculator.EC2_PLATFORM_DETAILS_TO_PRICING_NAMES.get((item as Ec2).platformDetails),
          '_' + (item as Ec2).usageOperation,
          '_' + (!(item as Ec2).tenancy || (item as Ec2).tenancy === 'default' ? 'Shared' : (item as Ec2).tenancy),
          '_' + ((item as Ec2).isSpotInstance ? '1' : '0')
        ).replace(/ /g, '')
      case AwsSubCommand.EIP_SUBCOMMAND:
        return AwsSubCommand.EIP_SUBCOMMAND.concat(
          '_' + item.getRegion()
        ).replace(/ /g, '')
      case AwsSubCommand.RDS_SUBCOMMAND:
        return AwsSubCommand.RDS_SUBCOMMAND.concat(
          '_' + item.getRegion(),
          '_' + (item as Rds).instanceType,
          '_' + AwsPriceCalculator.REDS_DB_TYPES_TO_PRICING_NAMES.get((item as Rds).dbType),
          '_' + ((item as Rds).multiAZ ? '1' : '0')
        ).replace(/ /g, '')
      case AwsSubCommand.ELB_SUBCOMMAND:
      case AwsSubCommand.NLB_SUBCOMMAND:
      case AwsSubCommand.ALB_SUBCOMMAND:
        return AwsSubCommand.ELB_SUBCOMMAND.concat(
          '_' + item.getRegion(),
          '_' + AwsPriceCalculator.LB_TYPES_TO_PRICING_NAMES.get((item as Elb).type || '')
        ).replace(/ /g, '')
    }
    return ''
  }
}
