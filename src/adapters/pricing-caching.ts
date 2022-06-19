import { PricingInterface } from './pricing-interface'
import { CachingInterface } from './caching-interface'
import { PricingListType } from '../domain/types/common/pricing-list-type'

export class PricingCaching implements PricingInterface {
  private static CACHE_KEY: string = 'pricing'

  private readonly pricing: PricingInterface
  private readonly caching: CachingInterface

  constructor (pricing: PricingInterface, caching: CachingInterface) {
    this.pricing = pricing
    this.caching = caching
  }

  async getPricingList (): Promise<PricingListType[]> {
    try {
      let result = await this.caching.get(PricingCaching.CACHE_KEY)
      if (result.length > 0) {
        return result
      }
      result = await this.pricing.getPricingList()
      await this.caching.set(PricingCaching.CACHE_KEY, result)
      return result
    } catch (e) {
      return []
    }
  }
}
