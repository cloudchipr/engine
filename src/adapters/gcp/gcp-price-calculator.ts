import { Disks } from '../../domain/types/gcp/disks'
import { CloudCatalogClient } from '@google-cloud/billing'

export class GcpPriceCalculator {
  private static DISKS_KEY_MAP = new Map([
    ['Balanced PD Capacity', 'pd-balanced'],
    ['Extreme PD Capacity', 'pd-extreme'],
    ['Storage PD Capacity', 'pd-standard'],
    ['SSD backed PD Capacity', 'pd-ssd'],
    ['Regional Balanced PD Capacity', 'regional-pd-balanced'],
    ['Regional Extreme PD Capacity', 'regional-pd-extreme'],
    ['Regional Storage PD Capacity', 'regional-pd-standard'],
    ['Regional SSD backed PD Capacity', 'regional-pd-ssd']
  ]);

  static async putDisksPrices (items: Disks[]): Promise<void> {
    const billingClient = new CloudCatalogClient()
    const allSkus = await billingClient.listSkus({ parent: 'services/6F81-5844-456A' })
    const skus = allSkus[0]

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
        price: price
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
}
