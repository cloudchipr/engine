import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'
import { AwsClientInterface } from './aws-client-interface'
import AwsEbsClient from './aws-ebs-client'
import AwsEc2Client from './aws-ec2-client'
import AwsEipClient from './aws-eip-client'
import AwsElbClient from './aws-elb-client'
import AwsRdsClient from './aws-rds-client'
import { AwsSubCommand } from '../../../aws-sub-command'
import { CleanResponse } from '../../../responses/clean-response'
import { CleanFailureResponse } from '../../../responses/clean-failure-response'
import { CleanRequestInterface } from '../../../request/clean/clean-request-interface'
import { Code } from '../../../responses/code'
import { Ebs } from '../../../domain/types/aws/ebs'
import { Ec2 } from '../../../domain/types/aws/ec2'
import { Eip } from '../../../domain/types/aws/eip'
import { Rds } from '../../../domain/types/aws/rds'
import { Elb } from '../../../domain/types/aws/elb'
import { PricingInterface } from '../../pricing-interface'
import { CachingInterface } from '../../caching-interface'
import { AwsCatalogClient } from './aws-catalog-client'
import AwsPriceCalculator from '../aws-price-calculator'

export default class AwsClient {
  constructor (
    private readonly credentialProvider: CredentialProvider
  ) {}

  async collectResources (
    accountId: string,
    regions: string[],
    pricingFallbackInterface?: PricingInterface,
    pricingCachingInterface?: CachingInterface
  ): Promise<Response<Ebs | Ec2 | Eip | Rds | Elb>[]> {
    const responses = (await Promise.all([
      this.getAwsClient(AwsSubCommand.EC2_SUBCOMMAND).collectAll(regions),
      this.getAwsClient(AwsSubCommand.EBS_SUBCOMMAND).collectAll(regions),
      this.getAwsClient(AwsSubCommand.EIP_SUBCOMMAND).collectAll(regions),
      this.getAwsClient(AwsSubCommand.ELB_SUBCOMMAND).collectAll(regions),
      this.getAwsClient(AwsSubCommand.RDS_SUBCOMMAND).collectAll(regions)
    ])) as Response<Ebs | Ec2 | Eip | Rds | Elb>[]
    await AwsCatalogClient.collectAllPricingLists(accountId, responses, this.credentialProvider, pricingFallbackInterface, pricingCachingInterface)
    // calculate prices
    await AwsPriceCalculator.putEc2Prices(accountId, responses[0] as Response<Ec2>, this.credentialProvider)
    await AwsPriceCalculator.putEbsPrices(accountId, responses[0] as Response<Ebs>, this.credentialProvider)
    await AwsPriceCalculator.putEipPrices(accountId, responses[0] as Response<Eip>, this.credentialProvider)
    await AwsPriceCalculator.putElbPrices(accountId, responses[0] as Response<Elb>, this.credentialProvider)
    await AwsPriceCalculator.putRdsPrices(accountId, responses[0] as Response<Rds>, this.credentialProvider)
    return responses
  }

  async cleanResources (request: CleanRequestInterface): Promise<CleanResponse> {
    const subcommand = request.subCommand.getValue()
    const client = this.getAwsClient(subcommand)
    const response = new CleanResponse(subcommand)
    let hasRateLimitError: boolean = false
    let start = 0
    while (true) {
      const promises: any[] = []
      const resources = request.resources.slice(start, start + client.getRateLimit())
      start += client.getRateLimit()
      if (resources.length === 0) {
        break
      }
      for (const resource of resources) {
        if (client.isCleanRequestValid(resource)) {
          promises.push(client.clean(resource))
        } else {
          response.addFailure(new CleanFailureResponse(resource.id, 'Invalid data provided', 'InvalidData'))
        }
      }
      // @ts-ignore
      const result: {status: string, value: string, reason: {id: string, message: string, code: string}}[] = await Promise.allSettled(promises)
      for (let i = 0; i < result.length; i++) {
        if (result[i].status === 'fulfilled') {
          response.addSuccess(result[i].value)
        } else {
          hasRateLimitError = hasRateLimitError || result[i].reason.code === 'RequestLimitExceeded'
          const code = result[i].reason.code === 'RequestLimitExceeded' ? Code.LIMIT_EXCEEDED : Code.UNKNOWN
          response.addFailure(new CleanFailureResponse(result[i].reason.id, result[i].reason.message, code))
        }
      }
      if (hasRateLimitError) {
        break
      }
    }
    if (hasRateLimitError) {
      for (let i = start; i < request.resources.length; i++) {
        response.addFailure(new CleanFailureResponse(request.resources[i].id, 'Request limit exceeded.', Code.LIMIT_EXCEEDED))
      }
    }
    return response
  }

  private getAwsClient (subcommand: string): AwsClientInterface {
    switch (subcommand) {
      case AwsSubCommand.EC2_SUBCOMMAND:
        return new AwsEc2Client(this.credentialProvider)
      case AwsSubCommand.EBS_SUBCOMMAND:
        return new AwsEbsClient(this.credentialProvider)
      case AwsSubCommand.ELB_SUBCOMMAND:
        return new AwsElbClient(this.credentialProvider)
      case AwsSubCommand.EIP_SUBCOMMAND:
        return new AwsEipClient(this.credentialProvider)
      case AwsSubCommand.RDS_SUBCOMMAND:
        return new AwsRdsClient(this.credentialProvider)
      default:
        throw new Error(`Client for subcommand ${subcommand} is not implemented!`)
    }
  }
}
