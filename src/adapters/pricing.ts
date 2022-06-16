import { PricingInterface } from './pricing-interface'

export class Pricing implements PricingInterface {
  async getPricingList (): Promise<any> {
    return ''
  }

  async setPricingList (): Promise<void> {
    console.log(1)
  }
}
