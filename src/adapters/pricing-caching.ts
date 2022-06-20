import { PricingInterface } from './pricing-interface'
import { CachingInterface } from './caching-interface'
import { PricingListType } from '../domain/types/common/pricing-list-type'

export class PricingCaching implements PricingInterface {
  private static CACHE_KEY_SUFFIX: string = 'pricing'

  private readonly pricing: PricingInterface
  private readonly caching: CachingInterface
  private readonly key: string

  constructor (pricing: PricingInterface, caching: CachingInterface, key: string) {
    this.pricing = pricing
    this.caching = caching
    this.key = key
  }

  async getPricingList (): Promise<PricingListType[]> {
    try {
      const cacheKey = `${this.key}_${PricingCaching.CACHE_KEY_SUFFIX}`
      let result: any[] = []
      result = await this.caching.get(cacheKey)
      if (result.length > 0) {
        return result
      }
      result = await this.pricing.getPricingList()
      await this.caching.set(cacheKey, result)
      return result
    } catch (e) {
      return []
    }
  }
}
