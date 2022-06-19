import { PricingInterface } from '../pricing-interface'
import { PricingListInterface } from '../../domain/interfaces/pricing-list-interface'
import { CachingInterface } from '../caching-interface'
import { AuthClient } from 'google-auth-library/build/src/auth/authclient'
import { GcpPricing } from './gcp-pricing'

export class GcpPricingCaching implements PricingInterface {
  private readonly auth: AuthClient
  private readonly pricing: PricingInterface
  private readonly caching?: CachingInterface

  constructor (auth: AuthClient, caching?: CachingInterface) {
    this.auth = auth
    this.pricing = new GcpPricing(auth)
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
