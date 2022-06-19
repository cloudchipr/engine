import { AuthClient } from 'google-auth-library/build/src/auth/authclient'
import { PricingInterface } from '../../pricing-interface'
import { PricingListInterface } from '../../../domain/interfaces/pricing-list-interface'
import { PricingCaching } from '../../pricing-caching'
import { CachingInterface } from '../../caching-interface'
import { GcpPricing } from '../gcp-pricing'

export class GcpCatalogClient {
  public static SKU: PricingListInterface[] = []

  static async collectAllStockKeepingUnits (auth: AuthClient, pricingCachingInterface?: CachingInterface): Promise<void> {
    if (GcpCatalogClient.SKU.length > 0) {
      return
    }
    const pricingCaching: PricingInterface = new PricingCaching(new GcpPricing(auth), pricingCachingInterface)
    const result = await pricingCaching.getPricingList()
    if (result.length > 0) {
      GcpCatalogClient.SKU = result
      return
    }
    // @todo here we need to use the c8r's auth
    const pricingCachingFallback: PricingInterface = new PricingCaching(new GcpPricing(auth), pricingCachingInterface)
    GcpCatalogClient.SKU = await pricingCachingFallback.getPricingList()
  }
}
