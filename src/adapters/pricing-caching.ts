import { PricingInterface } from './pricing-interface'
import { CachingInterface } from './caching-interface'
import { AwsPricingListType, GcpPricingListType, PricingListType } from '../domain/types/common/pricing-list-type'
import { CachingType } from '../domain/types/common/caching-type'
import { Response } from '../responses/response'

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

  async getPricingList (resources?: Response<any>[]): Promise<PricingListType> {
    let result: CachingType = {}
    try {
      result = await this.caching.get(PricingCaching.getCacheKey(this.key))
      if (!PricingCaching.isEmpty(result)) {
        return result
      }
      result = await this.pricing.getPricingList(resources)
      await this.caching.set(PricingCaching.getCacheKey(this.key), result)
    } catch (e) {}
    return result
  }

  static getCacheKey (key: string): string {
    return `${key}_${PricingCaching.CACHE_KEY_SUFFIX}`
  }

  private static instanceOfAwsPricingListType (data: any): data is AwsPricingListType {
    return typeof data === 'object' && !Array.isArray(data) && data !== null
  }

  private static instanceOfGcpPricingListType (data: any): data is GcpPricingListType[] {
    return typeof data === 'object' && Array.isArray(data)
  }

  private static isEmpty (data: any): boolean {
    return (PricingCaching.instanceOfAwsPricingListType(data) && Object.keys(data).length === 0) ||
      (PricingCaching.instanceOfGcpPricingListType(data) && data.length === 0) ||
      data === null
  }
}
