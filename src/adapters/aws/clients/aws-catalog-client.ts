import { AwsPricingListType } from '../../../domain/types/common/pricing-list-type'
import { PricingInterface } from '../../pricing-interface'
import { CachingInterface } from '../../caching-interface'
import { CredentialProvider } from '@aws-sdk/types'
import { PricingCaching } from '../../pricing-caching'
import { Response } from '../../../responses/response'
import { Ebs } from '../../../domain/types/aws/ebs'
import { Ec2 } from '../../../domain/types/aws/ec2'
import { Eip } from '../../../domain/types/aws/eip'
import { Rds } from '../../../domain/types/aws/rds'
import { Elb } from '../../../domain/types/aws/elb'
import AwsPricing from '../aws-pricing'
import AwsPriceCalculator from '../aws-price-calculator'

export class AwsCatalogClient {
  public static PRISING_LIST: AwsPricingListType = {}

  static async collectAllPricingLists (
    accountId: string,
    resources: Response<Ebs | Ec2 | Eip | Rds | Elb>[],
    credentialProvider: CredentialProvider,
    pricingFallbackInterface?: PricingInterface,
    pricingCachingInterface?: CachingInterface
  ) {
    // check if we have the all pricing list in the static variable
    let missingPricingList = AwsCatalogClient.getMissingPricingList(resources)
    if (AwsCatalogClient.isMissingPricingListEmpty(missingPricingList)) {
      return
    }
    // get all pricing list from cache/API
    const pricing = AwsCatalogClient.getPricingImplementation(accountId, new AwsPricing(credentialProvider), pricingCachingInterface)
    const pricingData = (await pricing.getPricingList(missingPricingList)) as AwsPricingListType
    AwsCatalogClient.PRISING_LIST = { ...AwsCatalogClient.PRISING_LIST, ...pricingData }
    // check if we were able to get the all pricing list
    missingPricingList = AwsCatalogClient.getMissingPricingList(resources)
    if (AwsCatalogClient.isMissingPricingListEmpty(missingPricingList)) {
      return
    }
    // check if we received the pricing list from the cache, and it was not full, call the API and set the cache
    if (pricingCachingInterface !== undefined) {
      const pricingData = (await (new AwsPricing(credentialProvider)).getPricingList(missingPricingList)) as AwsPricingListType
      AwsCatalogClient.PRISING_LIST = { ...AwsCatalogClient.PRISING_LIST, ...pricingData }
      // set the cache
      await pricingCachingInterface.set(`aws_${accountId}`, AwsCatalogClient.PRISING_LIST)
      // check if we were able to get the all pricing list
      missingPricingList = AwsCatalogClient.getMissingPricingList(resources)
      if (AwsCatalogClient.isMissingPricingListEmpty(missingPricingList)) {
        return
      }
    }
    if (pricingFallbackInterface) {
      const pricingData = (await pricingFallbackInterface.getPricingList(missingPricingList)) as AwsPricingListType
      AwsCatalogClient.PRISING_LIST = { ...AwsCatalogClient.PRISING_LIST, ...pricingData }
    }
  }

  private static getPricingImplementation (accountId: string, pricing: PricingInterface, pricingCachingInterface?: CachingInterface): PricingInterface {
    if (pricingCachingInterface !== undefined) {
      return new PricingCaching(pricing, pricingCachingInterface, `aws_${accountId}`)
    }
    return pricing
  }

  private static getMissingPricingList (resources: Response<Ebs | Ec2 | Eip | Rds | Elb>[]): Response<Ebs | Ec2 | Eip | Rds | Elb>[] {
    const result: Response<Ebs | Ec2 | Eip | Rds | Elb>[] = []
    resources.forEach((res) => {
      const items: (Ebs | Ec2 | Eip | Rds | Elb)[] = []
      res.items.forEach((item) => {
        const subCommand = item.constructor.name.toLowerCase()
        const key = AwsPriceCalculator.getItemUniqueKey(subCommand, item)
        if (!(key in AwsCatalogClient.PRISING_LIST)) {
          items.push(item)
        }
      })
      result.push(new Response<Ebs | Ec2 | Eip | Rds | Elb>(items))
    })
    return result
  }

  private static isMissingPricingListEmpty (resources: Response<Ebs | Ec2 | Eip | Rds | Elb>[]): boolean {
    for (const resource of resources) {
      if (resource.count > 0) {
        return false
      }
    }
    return true
  }
}
