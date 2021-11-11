import * as AWS from '@aws-sdk/client-pricing'
import {
  GetProductsCommandInput
} from '@aws-sdk/client-pricing/dist-types/commands/GetProductsCommand'
import { Pricing } from '@aws-sdk/client-pricing/dist-types/Pricing'

export default class AwsPricingClient {
    private client: Pricing;

    constructor (region: string, accessKeyId: string, secretAccessKey: string) {
      this.client = new AWS.Pricing({ region: region, credentials: { accessKeyId, secretAccessKey } })
    }

    // @todo handle region detection
    // @todo handle errors
    async getPrice (service: string, filter: object): Promise<
        {
            product:
                {
                    attributes: {
                        operatingSystem: string;
                    }
                },
            terms: {
                OnDemand: {
                    [key: string]: {
                        priceDimensions: {
                            [key: string]: {
                                endRange: string,
                                pricePerUnit: {
                                    USD: number
                                }
                            }
                        }
                    }
                }
            }
        }> {
      let result: any[] = []
      const params = {
        ServiceCode: service,
        Filters: filter,
        FormatVersion: 'aws_v1',
        MaxResults: 100
      } as GetProductsCommandInput

      try {
        let perPageResult = await this.client.getProducts(params)
        result = result.concat(perPageResult.PriceList)
        while (perPageResult.NextToken != null) {
          params.NextToken = perPageResult.NextToken
          perPageResult = await this.client.getProducts(params)
          result = result.concat(perPageResult.PriceList)
        }
      } catch (error) {
        console.log(error)
      }

      if (result.length > 1) { console.log('Price has more then one product, maybe price filters needs some improvements') }

      return result.map(p => { return JSON.parse(p) })[0]
    }
}
