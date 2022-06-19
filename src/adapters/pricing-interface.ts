import { PricingListType } from '../domain/types/common/pricing-list-type'

export interface PricingInterface {
  getPricingList (): Promise<PricingListType[]>
}
