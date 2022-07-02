import { PricingListType } from '../domain/types/common/pricing-list-type'
import { Response } from '../responses/response'

export interface PricingInterface {
  getPricingList (resources?: Response<any>[]): Promise<PricingListType>
}
