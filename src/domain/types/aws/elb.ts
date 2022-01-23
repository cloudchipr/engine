import { ProviderResource } from '../provider-resource'

export class Elb extends ProviderResource {
  protected readonly REGION_FETCH_REGEXP = /.*\.(.*)\.elb\.amazonaws\.com/;
  constructor (
        readonly loadBalancerName: string,
        readonly dnsName: string,
        readonly age?: string,
        readonly type?: string,
        readonly nameTag?: string,
        readonly _c8rRegion?: string,
        readonly _c8rAccount?: string
  ) {
    super()
  }

  getRegion (): string {
    const dnsAsArray = this.dnsName.split('.')
    if (dnsAsArray.length < 2) {
      throw new Error(`Cannot fetch region from load balancers ${this.dnsName}`)
    }
    const mergeResult = `${dnsAsArray[1]}.${dnsAsArray[2]}`
    return mergeResult.replace('elb.', '').replace('.elb', '')
  }
}
