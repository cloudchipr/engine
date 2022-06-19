import { PricingInterface } from '../pricing-interface'
import { google } from 'googleapis'
import { AuthClient } from 'google-auth-library/build/src/auth/authclient'
import { GcpPricingListInterface, PricingListInterface } from '../../domain/interfaces/pricing-list-interface'

export class GcpPricing implements PricingInterface {
  private static COMPUTING_SERVICE: string = 'services/6F81-5844-456A'

  private static SQL_SERVICE: string = 'services/9662-B51E-5089'

  private static VM_KEY_MAP = new Map([
    ['E2 Instance Ram running', 'e2_ram'],
    ['E2 Instance Core running', 'e2_cpu'],
    ['N2 Instance Ram running', 'n2_ram'],
    ['N2 Instance Core running', 'n2_cpu'],
    ['N2 Custom Instance Ram running', 'n2_custom_ram'],
    ['N2 Custom Instance Core running', 'n2_custom_cpu'],
    ['N2D AMD Instance Ram running', 'n2d_ram'],
    ['N2D AMD Instance Core running', 'n2d_cpu'],
    ['N2D AMD Custom Instance Ram running', 'n2d_custom_ram'],
    ['N2D AMD Custom Instance Core running', 'n2d_custom_cpu'],
    ['T2D AMD Instance Ram running', 't2d_ram'],
    ['T2D AMD Instance Core running', 't2d_cpu'],
    ['Compute optimized Ram running', 'c2_ram'],
    ['Compute optimized Core running', 'c2_cpu'],
    ['Memory-optimized Instance Ram running', 'm1_ram'],
    ['Memory-optimized Instance Core running', 'm1_cpu'],
    ['N1 Predefined Instance Ram running', 'n1_ram'],
    ['N1 Predefined Instance Core running', 'n1_cpu'],
    ['Custom Instance Ram running', 'custom_ram'],
    ['Custom Instance Core running', 'custom_cpu'],
    ['Micro Instance with burstable CPU running', 'f1_ram'],
    ['Small Instance with 1 VCPU running', 'g1_ram']
  ])

  private static DISKS_KEY_MAP = new Map([
    ['Balanced PD Capacity', 'pd-balanced'],
    ['Extreme PD Capacity', 'pd-extreme'],
    ['Storage PD Capacity', 'pd-standard'],
    ['SSD backed PD Capacity', 'pd-ssd'],
    ['Regional Balanced PD Capacity', 'regional-pd-balanced'],
    ['Regional Extreme PD Capacity', 'regional-pd-extreme'],
    ['Regional Storage PD Capacity', 'regional-pd-standard'],
    ['Regional SSD backed PD Capacity', 'regional-pd-ssd']
  ])

  private static EIP_KEY_MAP = new Map([
    ['Static Ip Charge', 'external']
  ])

  private static LB_KEY_MAP = new Map([
    ['Network Load Balancing: Forwarding Rule Minimum Service Charge', 'forwarding-rule']
  ])

  private static SQL_KEY_MAP = new Map([
    ['Cloud SQL for PostgreSQL: Zonal - vCPU', 'postgres_zonal_cpu'],
    ['Cloud SQL for PostgreSQL: Regional - vCPU', 'postgres_regional_cpu'],
    ['Cloud SQL for PostgreSQL: Zonal - RAM', 'postgres_zonal_ram'],
    ['Cloud SQL for PostgreSQL: Regional - RAM', 'postgres_regional_ram'],
    ['Cloud SQL for PostgreSQL: Zonal - Standard storage', 'postgres_zonal_storage'],
    ['Cloud SQL for PostgreSQL: Regional - Standard storage', 'postgres_regional_storage'],
    ['Cloud SQL for MySQL: Zonal - vCPU', 'mysql_zonal_cpu'],
    ['Cloud SQL for MySQL: Regional - vCPU', 'mysql_regional_cpu'],
    ['Cloud SQL for MySQL: Zonal - RAM', 'mysql_zonal_ram'],
    ['Cloud SQL for MySQL: Regional - RAM', 'mysql_regional_ram'],
    ['Cloud SQL for MySQL: Zonal - Standard storage', 'mysql_zonal_storage'],
    ['Cloud SQL for MySQL: Regional - Standard storage', 'mysql_regional_storage'],
    ['Cloud SQL for SQL Server: Zonal - vCPU', 'sqlserver_zonal_cpu'],
    ['Cloud SQL for SQL Server: Regional - vCPU', 'sqlserver_regional_cpu'],
    ['Cloud SQL for SQL Server: Zonal - RAM', 'sqlserver_zonal_ram'],
    ['Cloud SQL for SQL Server: Regional - RAM', 'sqlserver_regional_ram'],
    ['Cloud SQL for SQL Server: Zonal - Standard storage', 'sqlserver_zonal_storage'],
    ['Cloud SQL for SQL Server: Regional - Standard storage', 'sqlserver_regional_storage']
  ])

  private readonly authClient: AuthClient

  constructor (authClient: AuthClient) {
    this.authClient = authClient
  }

  async getPricingList (): Promise<PricingListInterface[]> {
    const response = await Promise.all([
      this.collectComputingStockKeepingUnits(),
      this.collectSqlStockKeepingUnits()
    ])
    const result: GcpPricingListInterface[] = []
    response.forEach((res) => {
      res.forEach((it: any) => {
        if (GcpPricing.isValidVmStockKeepingUnit(it)) {
          result.push(GcpPricing.mapVmStockKeepingUnit(it))
        } else if (GcpPricing.isValidDiskStockKeepingUnit(it)) {
          result.push(GcpPricing.mapDiskStockKeepingUnit(it))
        } else if (GcpPricing.isValidEipStockKeepingUnit(it)) {
          result.push(GcpPricing.mapEipStockKeepingUnit(it))
        } else if (GcpPricing.isValidLbStockKeepingUnit(it)) {
          result.push(GcpPricing.mapLbStockKeepingUnit(it))
        } else if (GcpPricing.isValidSqlStockKeepingUnit(it)) {
          result.push(GcpPricing.mapSqlStockKeepingUnit(it))
        }
      })
    })
    return result
  }

  private static isValidVmStockKeepingUnit (it: any): boolean {
    const key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
    return GcpPricing.VM_KEY_MAP.has(key) &&
      it.category?.resourceFamily === 'Compute' &&
      it.category?.usageType === 'OnDemand'
  }

  private static isValidDiskStockKeepingUnit (it: any): boolean {
    const key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
    return GcpPricing.DISKS_KEY_MAP.has(key) &&
      it.category?.resourceFamily === 'Storage' &&
      ['SSD', 'PDStandard'].includes(it.category?.resourceGroup as string) &&
      it.category?.usageType === 'OnDemand'
  }

  private static isValidEipStockKeepingUnit (it: any): boolean {
    const key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
    return GcpPricing.EIP_KEY_MAP.has(key) &&
      it.category?.resourceFamily === 'Network' &&
      it.category?.resourceGroup === 'IpAddress' &&
      it.category?.usageType === 'OnDemand'
  }

  private static isValidLbStockKeepingUnit (it: any): boolean {
    const key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
    return GcpPricing.LB_KEY_MAP.has(key) &&
      it.category?.resourceFamily === 'Network' &&
      it.category?.resourceGroup === 'LoadBalancing' &&
      it.category?.usageType === 'OnDemand'
  }

  private static isValidSqlStockKeepingUnit (it: any): boolean {
    const key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
    return GcpPricing.SQL_KEY_MAP.has(key) &&
      it.category?.resourceFamily === 'ApplicationServices' &&
      (
        it.category?.resourceGroup === 'SQLGen2InstancesRAM' ||
        it.category?.resourceGroup === 'SQLGen2InstancesCPU' ||
        it.category?.resourceGroup === 'SSD'
      ) &&
      it.category?.usageType === 'OnDemand'
  }

  private static mapVmStockKeepingUnit (it: any): GcpPricingListInterface {
    let key = GcpPricing.VM_KEY_MAP.get(it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || '') || ''
    if (key.split(/^Nvidia Tesla (.*) GPU running$/g).length > 1) {
      key = 'gpu_' + key.split(/^Nvidia Tesla (.*) GPU running$/g)[1]
    }
    let price: number | undefined
    if (it.pricingInfo && it.pricingInfo[0].pricingExpression && it.pricingInfo[0].pricingExpression.tieredRates) {
      const pricingExpression = it.pricingInfo[0].pricingExpression
      const tieredRates = it.pricingInfo[0].pricingExpression.tieredRates
      const unitPrice = tieredRates[tieredRates.length - 1].unitPrice
      if (unitPrice?.units !== undefined) {
        price = (parseInt(unitPrice.units as string) + ((unitPrice.nanos || 0) / 1000000000))
        if (pricingExpression.usageUnit === 'GiBy.h' || pricingExpression.usageUnit === 'h') {
          price *= 730
        }
      }
    }
    return {
      key,
      regions: it.serviceRegions,
      price
    }
  }

  private static mapDiskStockKeepingUnit (it: any): GcpPricingListInterface {
    const key = GcpPricing.DISKS_KEY_MAP.get(it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || '') || ''
    let price: number | undefined
    if (it.pricingInfo && it.pricingInfo[0].pricingExpression && it.pricingInfo[0].pricingExpression.tieredRates) {
      const unitPrice = it.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
      if (unitPrice?.units !== undefined) {
        price = parseInt(unitPrice.units as string) + ((unitPrice.nanos || 0) / 1000000000)
      }
    }
    return {
      key,
      regions: it.serviceRegions,
      price
    }
  }

  private static mapEipStockKeepingUnit (it: any): GcpPricingListInterface {
    const extraRegions = []
    const key = GcpPricing.EIP_KEY_MAP.get(it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || '') || ''
    if (it.description === 'Static Ip Charge') {
      extraRegions.push('global')
    }
    let price: number | undefined
    if (it.pricingInfo && it.pricingInfo[0].pricingExpression && it.pricingInfo[0].pricingExpression.tieredRates) {
      const pricingExpression = it.pricingInfo[0].pricingExpression
      const tieredRates = it.pricingInfo[0].pricingExpression.tieredRates
      const unitPrice = tieredRates[tieredRates.length - 1].unitPrice
      if (unitPrice?.units !== undefined) {
        price = (parseInt(unitPrice.units as string) + ((unitPrice.nanos || 0) / 1000000000))
        if (pricingExpression.usageUnit === 'h') {
          price *= 730
        }
      }
    }
    return {
      key,
      regions: [...it.serviceRegions as string[], ...extraRegions],
      price
    }
  }

  private static mapLbStockKeepingUnit (it: any): GcpPricingListInterface {
    let key = GcpPricing.LB_KEY_MAP.get(it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || '') || ''
    if (it.description === 'HTTP Load Balancing: Global Forwarding Rule Minimum Service Charge') {
      key = 'global'
    }
    let price: number | undefined
    if (it.pricingInfo && it.pricingInfo[0].pricingExpression && it.pricingInfo[0].pricingExpression.tieredRates) {
      const pricingExpression = it.pricingInfo[0].pricingExpression
      const unitPrice = it.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
      if (unitPrice?.units !== undefined) {
        price = parseInt(unitPrice.units as string) + ((unitPrice.nanos || 0) / 1000000000)
        if (pricingExpression.usageUnit === 'h') {
          price *= 730
        }
      }
    }
    return {
      key,
      regions: it.serviceRegions,
      price
    }
  }

  private static mapSqlStockKeepingUnit (it: any): GcpPricingListInterface {
    const key = GcpPricing.SQL_KEY_MAP.get(it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || '') || ''
    let price: number | undefined
    if (it.pricingInfo && it.pricingInfo[0].pricingExpression && it.pricingInfo[0].pricingExpression.tieredRates) {
      const pricingExpression = it.pricingInfo[0].pricingExpression
      const unitPrice = it.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
      if (unitPrice?.units !== undefined) {
        price = parseInt(unitPrice.units as string) + ((unitPrice.nanos || 0) / 1000000000)
        if (pricingExpression.usageUnit === 'h' || pricingExpression.usageUnit === 'GiBy.h') {
          price *= 730
        }
      }
    }
    return {
      key,
      regions: it.serviceRegions,
      price
    }
  }

  private async collectComputingStockKeepingUnits (): Promise<any> {
    const config: any = { parent: GcpPricing.COMPUTING_SERVICE, auth: this.authClient }
    let data: any[] = []
    while (true) {
      const result = await google.cloudbilling('v1').services.skus.list(config)
      data = [...data, ...(result?.data?.skus ?? [])]
      if (result?.data?.nextPageToken) {
        config.pageToken = result?.data?.nextPageToken
      } else {
        break
      }
    }
    return data
  }

  private async collectSqlStockKeepingUnits () {
    const config: any = { parent: GcpPricing.SQL_SERVICE, auth: this.authClient }
    let data: any[] = []
    while (true) {
      const result = await google.cloudbilling('v1').services.skus.list(config)
      data = [...data, ...(result?.data?.skus ?? [])]
      if (result?.data?.nextPageToken) {
        config.pageToken = result?.data?.nextPageToken
      } else {
        break
      }
    }
    return data
  }
}
