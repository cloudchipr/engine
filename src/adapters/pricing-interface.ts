export interface PricingInterface {
  getPricingList (): Promise<any>

  setPricingList (): Promise<void>
}
