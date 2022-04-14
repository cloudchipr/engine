import { Disks } from '../../domain/types/gcp/disks'
import { CloudCatalogClient } from '@google-cloud/billing'
import { Eip } from '../../domain/types/gcp/eip'
import { Lb } from '../../domain/types/gcp/lb'
import { Sql } from '../../domain/types/gcp/sql'
import { Vm } from '../../domain/types/gcp/vm'
import { GcpPriceCalculatorHelper } from './gcp-price-calculator-helper'

export class GcpPriceCalculator {
  private static COMPUTING_SERVICE = 'services/6F81-5844-456A'
  private static SQL_SERVICE = 'services/9662-B51E-5089'

  private static VM_KEY_MAP = new Map([
    ['E2 Instance Ram running', 'e2_ram'],
    ['E2 Instance Core running', 'e2_cpu'],
    ['N2 Instance Ram running', 'n2_ram'],
    ['N2 Instance Core running', 'n2_cpu'],
    ['N2 Custom Instance Ram running', 'n2_custom_ram'],
    ['N2 Custom Instance Core running', 'n2_custom_cpu'],
    ['N2D AMD Instance Ram running', 'n2d_ram'],
    ['N2D AMD Instance Core running', 'n2d_core'],
    ['N2D AMD Custom Instance Ram running', 'n2d_custom_ram'],
    ['N2D AMD Custom Instance Core running', 'n2d_custom_core'],
    ['T2D AMD Instance Ram running', 't2d_ram'],
    ['T2D AMD Instance Core running', 't2d_core'],
    ['Compute optimized Ram running', 'co_ram'],
    ['Compute optimized Core running', 'co_core'],
    ['Memory-optimized Instance Ram running', 'mo_ram'],
    ['Memory-optimized Instance Core running', 'mo_core'],
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

  static async putVmPrices (items: Vm[]): Promise<void> {
    const skus = await GcpPriceCalculator.getAllSkus(GcpPriceCalculator.COMPUTING_SERVICE)
    const vms = skus.filter((it) => {
      return it.category?.resourceFamily === 'Compute' &&
        it.category?.usageType === 'OnDemand'
    }).map((it) => {
      let key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
      if (GcpPriceCalculator.VM_KEY_MAP.has(key)) {
        key = GcpPriceCalculator.VM_KEY_MAP.get(key) || ''
      }
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
          if (pricingExpression.usageUnit === 'GiBy.h') {
            price *= 730
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
      const series = item.machineType.split('-')[0].toLowerCase()
      const { ram, cpu } = GcpPriceCalculatorHelper.getVmRamAndCpu(item.machineType)
      const ramKey = series + '_ram'
      const cpuKey = series + '_cpu'
      const ramPrice = vms.filter((vm) => vm.key === ramKey && vm.regions?.includes(item.getRegion()))[0]?.price
      const cpuPrice = vms.filter((vm) => vm.key === cpuKey && vm.regions?.includes(item.getRegion()))[0]?.price
      if (ramPrice && ram && cpuPrice && cpu) {
        item.pricePerMonth = ramPrice * ram + cpuPrice * cpu
      }
    })
  }

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
            price *= 730
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
      }
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
    })

    items.forEach((item) => {
      const type = item.type?.split('_')[0].toLowerCase()
      const tempKey = type + '_' + (item.multiAz ? 'regional' : 'zonal') + '_'
      const ramKey = tempKey + 'ram'
      const cpuKey = tempKey + 'cpu'
      const storageKey = tempKey + 'storage'
      const ramPrice = dbs.filter((db) => db.key === ramKey && db.regions?.includes(item.getRegion()))[0]?.price
      const cpuPrice = dbs.filter((db) => db.key === cpuKey && db.regions?.includes(item.getRegion()))[0]?.price
      const storagePrice = dbs.filter((db) => db.key === storageKey && db.regions?.includes(item.getRegion()))[0]?.price
      if (ramPrice && item.ram && cpuPrice && item.cpu && storagePrice && item.storage) {
        item.pricePerMonth = ramPrice * item.ram / 1000 + cpuPrice * item.cpu + storagePrice * item.storage
      }
    })
  }

  private static async getAllSkus (parent: string) {
    const billingClient = new CloudCatalogClient()
    const allSkus = await billingClient.listSkus({ parent })
    return allSkus[0]
  }
}
