import { PricingListInterface } from '../domain/interfaces/pricing-list-interface'

export interface CachingInterface {
  get (key: string): Promise<PricingListInterface[]>

  set (key: string, list: PricingListInterface[]): Promise<void>
}
