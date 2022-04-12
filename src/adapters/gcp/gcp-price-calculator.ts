import { Disks } from '../../domain/types/gcp/disks'
import { CloudCatalogClient } from '@google-cloud/billing'
import { Eip } from '../../domain/types/gcp/eip'
import { Lb } from '../../domain/types/gcp/lb'
import { Sql } from '../../domain/types/gcp/sql'
import fs from 'fs'

export class GcpPriceCalculator {
  private static COMPUTING_SERVICE = 'services/6F81-5844-456A'
  private static SQL_SERVICE = 'services/9662-B51E-5089'

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

  static async putDisksPrices (items: Disks[]): Promise<void> {
    const skus = await GcpPriceCalculator.getAllSkus(GcpPriceCalculator.COMPUTING_SERVICE)
    const storages = skus.filter((it) => {
      return it.category?.resourceFamily === 'Storage' &&
        ['SSD', 'PDStandard'].includes(it.category?.resourceGroup as string) &&
        it.category?.usageType === 'OnDemand'
    }).map((it) => {
      let key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
      if (GcpPriceCalculator.DISKS_KEY_MAP.has(key)) {
        key = GcpPriceCalculator.DISKS_KEY_MAP.get(key) || ''
      }
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
    })

    items.forEach((item) => {
      const storage = storages.filter((st) => st.key === item.type && st.regions?.includes(item.getRegion()))[0]
      const priceGb = storage.price
      if (priceGb !== undefined) {
        item.pricePerMonth = priceGb * (item.size / 1073741824)
      }
    })
  }

  static async putEipPrices (items: Eip[]): Promise<void> {
    const skus = await GcpPriceCalculator.getAllSkus(GcpPriceCalculator.COMPUTING_SERVICE)
    const networks = skus.filter((it) => {
      return it.category?.resourceFamily === 'Network' &&
        it.category?.resourceGroup === 'IpAddress' &&
        it.category?.usageType === 'OnDemand'
    }).map((it) => {
      const extraRegions = []
      let key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
      if (GcpPriceCalculator.EIP_KEY_MAP.has(key)) {
        key = GcpPriceCalculator.EIP_KEY_MAP.get(key) || ''
      }
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
            price *= 720
          }
        }
      }
      return {
        key,
        regions: [...it.serviceRegions as string[], ...extraRegions],
        price
      }
    })

    items.forEach((item) => {
      const region = item.region ? item.getRegion() : 'global'
      const key = item.region ? item.type : 'external'
      const network = networks.filter((nt) => nt.key === key && nt.regions?.includes(region))[0]
      item.pricePerMonth = network?.price
    })
  }

  static async putLbPrices (items: Lb[]): Promise<void> {
    const skus = await GcpPriceCalculator.getAllSkus(GcpPriceCalculator.COMPUTING_SERVICE)
    const loadBalancers = skus.filter((it) => {
      return it.category?.resourceFamily === 'Network' &&
        it.category?.resourceGroup === 'LoadBalancing' &&
        it.category?.usageType === 'OnDemand'
    }).map((it) => {
      let key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
      if (GcpPriceCalculator.LB_KEY_MAP.has(key)) {
        key = GcpPriceCalculator.LB_KEY_MAP.get(key) || ''
      } else if (it.serviceRegions?.includes('global')) {
        key = 'global'
      }
      let price: number | undefined
      if (it.pricingInfo && it.pricingInfo[0].pricingExpression && it.pricingInfo[0].pricingExpression.tieredRates) {
        const pricingExpression = it.pricingInfo[0].pricingExpression
        const unitPrice = it.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
        if (unitPrice?.units !== undefined) {
          price = parseInt(unitPrice.units as string) + ((unitPrice.nanos || 0) / 1000000000)
          if (pricingExpression.usageUnit === 'h') {
            price *= 720
          }
        }
      }
      return {
        key,
        regions: it.serviceRegions,
        price
      }
    })

    items.forEach((item) => {
      const region = item.global ? 'global' : item.getRegion()
      const key = item.global ? 'global' : 'forwarding-rule'
      const loadBalancer = loadBalancers.filter((lb) => lb.key === key && lb.regions?.includes(region))[0]
      item.pricePerMonth = loadBalancer?.price
    })
  }

  static async putSqlPrices (items: Sql[]): Promise<void> {
    const skus = await GcpPriceCalculator.getAllSkus(GcpPriceCalculator.SQL_SERVICE)
    const aaa = skus.filter((it) => {
      return it.category?.resourceFamily === 'ApplicationServices' &&
        (
          it.category?.resourceGroup === 'SQLGen2InstancesRAM' ||
          it.category?.resourceGroup === 'SQLGen2InstancesCPU' ||
          it.category?.resourceGroup === 'SSD'
        ) &&
        it.category?.usageType === 'OnDemand'
    })
    await fs.promises.writeFile('./before.json', JSON.stringify(aaa), 'utf8')
    const dbs = skus.filter((it) => {
      return it.category?.resourceFamily === 'ApplicationServices' &&
        (
          it.category?.resourceGroup === 'SQLGen2InstancesRAM' ||
          it.category?.resourceGroup === 'SQLGen2InstancesCPU' ||
          it.category?.resourceGroup === 'SSD'
        ) &&
        it.category?.usageType === 'OnDemand'
    }).map((it) => {
      let key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
      if (GcpPriceCalculator.SQL_KEY_MAP.has(key)) {
        key = GcpPriceCalculator.SQL_KEY_MAP.get(key) || ''
      }
      let price: number | undefined
      if (it.pricingInfo && it.pricingInfo[0].pricingExpression && it.pricingInfo[0].pricingExpression.tieredRates) {
        const pricingExpression = it.pricingInfo[0].pricingExpression
        const unitPrice = it.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
        if (unitPrice?.units !== undefined) {
          price = parseInt(unitPrice.units as string) + ((unitPrice.nanos || 0) / 1000000000)
          if (pricingExpression.usageUnit === 'h') {
            price *= 720
          }
        }
      }
      return {
        key,
        regions: it.serviceRegions,
        price
      }
    })

    await fs.promises.writeFile('./after.json', JSON.stringify(dbs), 'utf8')

    items.forEach((item) => {
      const type = item.type?.split('_')[0].toLowerCase()
      const tempKey = type + '_' + (item.multiAz ? 'regional' : 'zonal') + '_'
      const ramKey = tempKey + 'ram'
      const cpuKey = tempKey + 'cpu'
      const storageKey = tempKey + 'storage'
      const ramPrice = dbs.filter((db) => db.key === ramKey && db.regions?.includes(item.getRegion()))[0]?.price
      const cpuPrice = dbs.filter((db) => db.key === cpuKey && db.regions?.includes(item.getRegion()))[0]?.price
      const storagePrice = dbs.filter((db) => db.key === storageKey && db.regions?.includes(item.getRegion()))[0]?.price
      if (ramPrice && cpuPrice && storagePrice) {
        item.pricePerMonth = ramPrice + cpuPrice + storagePrice
      }
    })
  }

  private static async getAllSkus (parent: string) {
    const billingClient = new CloudCatalogClient()
    const allSkus = await billingClient.listSkus({ parent })
    return allSkus[0]
  }
}
