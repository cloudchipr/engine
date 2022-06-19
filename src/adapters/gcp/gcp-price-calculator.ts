import { Disks } from '../../domain/types/gcp/disks'
import { Eip } from '../../domain/types/gcp/eip'
import { Lb } from '../../domain/types/gcp/lb'
import { Sql } from '../../domain/types/gcp/sql'
import { Vm } from '../../domain/types/gcp/vm'
import { GcpPriceCalculatorHelper } from './gcp-price-calculator-helper'
import { GcpCatalogClient } from './clients/gcp-catalog-client'

export class GcpPriceCalculator {
  static async putVmPrices (items: Vm[], disks: Disks[], auth: any): Promise<void> {
    await GcpCatalogClient.collectAllStockKeepingUnits(auth)
    items.forEach((item) => {
      const series = item.machineType.split('-')[0].toLowerCase()
      const type = item.machineType.split('-')[1].toLowerCase()
      const { ram, cpu } = GcpPriceCalculatorHelper.getVmRamAndCpu(item.machineType)
      const ramKey = series + (type === 'custom' ? '_custom' : '') + '_ram'
      const cpuKey = series + (type === 'custom' ? '_custom' : '') + '_cpu'
      const ramPrice = GcpCatalogClient.SKU.filter((vm) => vm.key === ramKey && vm.regions?.includes(item.getRegion()))[0]?.price
      const cpuPrice = GcpCatalogClient.SKU.filter((vm) => vm.key === cpuKey && vm.regions?.includes(item.getRegion()))[0]?.price
      const diskPrice = disks.reduce((prev, current) => prev + (item.disks.includes(current.name) ? (current.pricePerMonth || 0) : 0), 0)
      if (ramPrice && ram && cpuPrice && cpu) {
        item.pricePerMonth = ramPrice * ram + cpuPrice * cpu + diskPrice
      }
      item.ram = ram
      item.vcpu = cpu
    })
  }

  static async putDisksPrices (items: Disks[], auth: any): Promise<void> {
    await GcpCatalogClient.collectAllStockKeepingUnits(auth)
    items.forEach((item) => {
      const storage = GcpCatalogClient.SKU.filter((st) => st.key === item.type && st.regions?.includes(item.getRegion()))[0]
      const priceGb = storage?.price
      if (priceGb !== undefined) {
        item.pricePerMonth = priceGb * (item.size / 1073741824)
      }
    })
  }

  static async putEipPrices (items: Eip[], auth: any): Promise<void> {
    await GcpCatalogClient.collectAllStockKeepingUnits(auth)
    items.forEach((item) => {
      const region = item.region ? item.getRegion() : 'global'
      const key = item.region ? item.type : 'external'
      const network = GcpCatalogClient.SKU.filter((nt) => nt.key === key && nt.regions?.includes(region))[0]
      item.pricePerMonth = network?.price
    })
  }

  static async putLbPrices (items: Lb[], auth: any): Promise<void> {
    await GcpCatalogClient.collectAllStockKeepingUnits(auth)
    items.forEach((item) => {
      const region = item.global ? 'global' : item.getRegion()
      const key = item.global ? 'global' : 'forwarding-rule'
      const loadBalancer = GcpCatalogClient.SKU.filter((lb) => lb.key === key && lb.regions?.includes(region))[0]
      item.pricePerMonth = loadBalancer?.price
    })
  }

  static async putSqlPrices (items: Sql[], auth: any): Promise<void> {
    await GcpCatalogClient.collectAllStockKeepingUnits(auth)
    items.forEach((item) => {
      const type = item.type?.split('_')[0].toLowerCase()
      const tempKey = type + '_' + (item.multiAz ? 'regional' : 'zonal') + '_'
      const ramKey = tempKey + 'ram'
      const cpuKey = tempKey + 'cpu'
      const storageKey = tempKey + 'storage'
      const ramPrice = GcpCatalogClient.SKU.filter((db) => db.key === ramKey && db.regions?.includes(item.getRegion()))[0]?.price
      const cpuPrice = GcpCatalogClient.SKU.filter((db) => db.key === cpuKey && db.regions?.includes(item.getRegion()))[0]?.price
      const storagePrice = GcpCatalogClient.SKU.filter((db) => db.key === storageKey && db.regions?.includes(item.getRegion()))[0]?.price
      if (ramPrice && item.ram && cpuPrice && item.cpu && storagePrice && item.storage) {
        item.pricePerMonth = ramPrice * item.ram / 1000 + cpuPrice * item.cpu + storagePrice * item.storage
      }
    })
  }
}
