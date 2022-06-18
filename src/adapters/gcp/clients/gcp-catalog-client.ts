import { GcpPricing } from '../gcp-pricing'
import { AuthClient } from 'google-auth-library/build/src/auth/authclient'
import { PricingInterface } from '../../pricing-interface'
import { PricingListInterface } from '../../../domain/interfaces/gcp-pricing'

export class GcpCatalogClient {
  public static SKU: PricingListInterface[] = []

  static async collectAllStockKeepingUnits (auth: AuthClient, pricingInterface?: PricingInterface): Promise<void> {
    if (GcpCatalogClient.SKU.length > 0) {
      return
    }
    const pricingFallbackInterface: PricingInterface = new GcpPricing(auth)

    // get stock keeping units from the provided interface by the user's account
    try {
      GcpCatalogClient.SKU = pricingInterface !== undefined ? await pricingInterface.getPricingList() : []
    } catch (e) {}
    if (GcpCatalogClient.SKU.length > 0) {
      return
    }

    // get stock keeping units from the fallback interface by the user's account
    try {
      GcpCatalogClient.SKU = await pricingFallbackInterface.getPricingList()
      if (pricingInterface !== undefined) {
        await pricingInterface.setPricingList(GcpCatalogClient.SKU)
      }
    } catch (e) {}
    if (GcpCatalogClient.SKU.length > 0) {
      return
    }

    // get stock keeping units from the provided interface by the c8r's account
    try {
      GcpCatalogClient.SKU = pricingInterface !== undefined ? await pricingInterface.getFallbackPricingList() : []
    } catch (e) {}
    if (GcpCatalogClient.SKU.length > 0) {
      return
    }

    // get stock keeping units from the fallback interface by the c8r's account
    try {
      GcpCatalogClient.SKU = await pricingFallbackInterface.getFallbackPricingList()
      if (pricingInterface !== undefined) {
        await pricingInterface.setFallbackPricingList(GcpCatalogClient.SKU)
      }
    } catch (e) {}
  }
}
