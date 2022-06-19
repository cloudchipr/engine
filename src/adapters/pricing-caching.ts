import { PricingInterface } from './pricing-interface'
import { PricingListInterface } from '../domain/interfaces/pricing-list-interface'
import { CachingInterface } from './caching-interface'

export class PricingCaching implements PricingInterface {
  private readonly pricing: PricingInterface
  private readonly caching?: CachingInterface

  constructor (pricing: PricingInterface, caching?: CachingInterface) {
    this.pricing = pricing
    this.caching = caching
  }

  async getPricingList (): Promise<PricingListInterface[]> {
    try {
      // @todo here we need to use appropriate key
      const key = 'some_key'
      let result = this.caching !== undefined ? await this.caching.get(key) : []
      if (result.length > 0) {
        return result
      }
      result = await this.pricing.getPricingList()
      if (this.caching !== undefined) {
        await this.caching.set(key, result)
      }
      return result
    } catch (e) {
      return []
    }
  }
}
