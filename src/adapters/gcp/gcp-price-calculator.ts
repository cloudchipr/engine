import { Disks } from '../../domain/types/gcp/disks'
import { CloudCatalogClient } from '@google-cloud/billing'
import { Eip } from '../../domain/types/gcp/eip'
import { Lb } from '../../domain/types/gcp/lb'

export class GcpPriceCalculator {
  private static COMPUTING_SERVICE = 'services/6F81-5844-456A'

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
  ]);

  static async putDisksPrices (items: Disks[]): Promise<void> {
    const skus = await GcpPriceCalculator.getAllSkus()
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
    const skus = await GcpPriceCalculator.getAllSkus()
    const networks = skus.filter((it) => {
      return it.category?.resourceFamily === 'Network' &&
        it.category?.resourceGroup === 'IpAddress' &&
        it.category?.usageType === 'OnDemand'
    }).map((it) => {
      let key = it.description?.split(/^(.*) in(.*)$/g)[1] || it.description || ''
      if (GcpPriceCalculator.EIP_KEY_MAP.has(key)) {
        key = GcpPriceCalculator.EIP_KEY_MAP.get(key) || ''
      } else if (it.serviceRegions?.includes('global')) {
        key = 'global'
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
        regions: it.serviceRegions,
        price
      }
    })

    items.forEach((item) => {
      const region = item.region ? item.getRegion() : 'global'
      const key = item.region ? item.type : 'global'
      const network = networks.filter((nt) => nt.key === key && nt.regions?.includes(region))[0]
      item.pricePerMonth = network?.price
    })
  }

  static async putLbPrices (items: Lb[]): Promise<void> {
    const skus = await GcpPriceCalculator.getAllSkus()
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

  private static async getAllSkus () {
    const billingClient = new CloudCatalogClient()
    const allSkus = await billingClient.listSkus({ parent: GcpPriceCalculator.COMPUTING_SERVICE })
    return allSkus[0]
  }
}
