import { AuthClient } from 'google-auth-library/build/src/auth/authclient'
import { PricingInterface } from '../../pricing-interface'
import { PricingListInterface } from '../../../domain/interfaces/pricing-list-interface'
import { GcpPricingCaching } from '../gcp-pricing-caching'
import { CachingInterface } from '../../caching-interface'

export class GcpCatalogClient {
  public static SKU: PricingListInterface[] = []

  static async collectAllStockKeepingUnits (auth: AuthClient, pricingCachingInterface?: CachingInterface): Promise<void> {
    if (GcpCatalogClient.SKU.length > 0) {
      return
    }
    const pricingCaching: PricingInterface = new GcpPricingCaching(auth, pricingCachingInterface)
    const result = await pricingCaching.getPricingList()
    if (result.length > 0) {
      GcpCatalogClient.SKU = result
      return
    }
    // @todo here we need to use the c8r's auth
    const pricingCachingFallback: PricingInterface = new GcpPricingCaching(auth, pricingCachingInterface)
    GcpCatalogClient.SKU = await pricingCachingFallback.getPricingList()
  }
}
