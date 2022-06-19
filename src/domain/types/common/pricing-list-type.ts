export interface GcpPricingListType {
  key: string
  regions: string[]
  price: number | undefined
}

export type PricingListType =
  | GcpPricingListType
