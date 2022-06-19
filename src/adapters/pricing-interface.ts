import { PricingListInterface } from '../domain/interfaces/pricing-list-interface'

export interface PricingInterface {
  getPricingList (): Promise<PricingListInterface[]>
}
