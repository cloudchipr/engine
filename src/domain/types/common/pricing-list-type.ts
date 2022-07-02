export interface GcpPricingListType {
  key: string
  regions: string[]
  price: number | undefined
}

export interface AwsPricingListType {
  [key: string]: {
    price: number
    currency: string,
  }
}

export type PricingListType =
  | GcpPricingListType[]
  | AwsPricingListType
