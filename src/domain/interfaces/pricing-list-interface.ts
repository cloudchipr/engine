export interface GcpPricingListInterface {
  key: string
  regions: string[]
  price: number | undefined
}

export type PricingListInterface =
  | GcpPricingListInterface
