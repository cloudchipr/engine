import { AuthClient } from 'google-auth-library/build/src/auth/authclient'
import { PricingInterface } from '../../pricing-interface'
import { PricingCaching } from '../../pricing-caching'
import { CachingInterface } from '../../caching-interface'
import { GcpPricing } from '../gcp-pricing'
import { PricingListType } from '../../../domain/types/common/pricing-list-type'

export class GcpCatalogClient {
  public static SKU: PricingListType[] = []

  static async collectAllStockKeepingUnits (
    auth: AuthClient,
    project?: string,
    pricingFallbackInterface?: PricingInterface,
    pricingCachingInterface?: CachingInterface
  ): Promise<void> {
    if (GcpCatalogClient.SKU.length > 0) {
      return
    }
    const pricing = GcpCatalogClient.getPricingImplementation(new GcpPricing(auth), pricingCachingInterface, project)
    const result = await pricing.getPricingList()
    if (result.length > 0) {
      GcpCatalogClient.SKU = result
      return
    }
    if (pricingFallbackInterface) {
      const pricingCachingFallback = GcpCatalogClient.getPricingImplementation(pricingFallbackInterface, pricingCachingInterface)
      GcpCatalogClient.SKU = await pricingCachingFallback.getPricingList()
    }
  }

  private static getPricingImplementation (pricing: PricingInterface, pricingCachingInterface?: CachingInterface, project?: string): PricingInterface {
    if (pricingCachingInterface !== undefined) {
      const keyPrefix = project ? `gcp_${project}` : 'gcp'
      return new PricingCaching(pricing, pricingCachingInterface, keyPrefix)
    }
    return pricing
  }
}
