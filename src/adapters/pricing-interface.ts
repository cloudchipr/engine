import { PricingListInterface as GcpPricingListInterface } from '../domain/interfaces/gcp-pricing'

export interface PricingInterface {
  getPricingList (): Promise<GcpPricingListInterface[]>

  getFallbackPricingList (): Promise<GcpPricingListInterface[]>

  setPricingList (list: GcpPricingListInterface[]): Promise<void>

  setFallbackPricingList (list: GcpPricingListInterface[]): Promise<void>
}
