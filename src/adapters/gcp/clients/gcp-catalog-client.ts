import { AuthClient } from 'google-auth-library/build/src/auth/authclient'
import { PricingInterface } from '../../pricing-interface'
import { PricingCaching } from '../../pricing-caching'
import { CachingInterface } from '../../caching-interface'
import { GcpPricing } from '../gcp-pricing'
import { GcpPricingListType } from '../../../domain/types/common/pricing-list-type'

export class GcpCatalogClient {
  public static SKU: GcpPricingListType[] = []

  static async collectAllStockKeepingUnits (
    auth: AuthClient,
    project?: string,
    pricingFallbackInterface?: PricingInterface,
    pricingCachingInterface?: CachingInterface
  ): Promise<GcpPricingListType[]> {
    const pricing = GcpCatalogClient.getPricingImplementation(new GcpPricing(auth), pricingCachingInterface, project)
    const result = await pricing.getPricingList()
    if (result.length > 0) {
      return result as GcpPricingListType[]
    }
    if (pricingFallbackInterface) {
      const pricingCachingFallback = GcpCatalogClient.getPricingImplementation(pricingFallbackInterface, pricingCachingInterface)
      return (await pricingCachingFallback.getPricingList()) as GcpPricingListType[]
    }
    return []
  }

  private static getPricingImplementation (pricing: PricingInterface, pricingCachingInterface?: CachingInterface, project?: string): PricingInterface {
    if (pricingCachingInterface !== undefined) {
      const keyPrefix = project ? `gcp_${project}` : 'gcp'
      return new PricingCaching(pricing, pricingCachingInterface, keyPrefix)
    }
    return pricing
  }
}
