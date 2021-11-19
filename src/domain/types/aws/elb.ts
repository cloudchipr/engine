import { ProviderResource } from '../provider-resource'

export class Elb extends ProviderResource {
  protected readonly REGION_FETCH_REGEXP = /.*\.(.*)\.elb\.amazonaws\.com/;
  constructor (
        readonly dnsName: string,
        readonly age?: string,
        readonly nameTag?: string,
        readonly _c8rRegion?: string
  ) {
    super()
  }

  getRegion (): string {
    const matches = this.dnsName.match(this.REGION_FETCH_REGEXP)
    if (matches == null || matches[1] === undefined) {
      console.log(matches)
      throw new Error('Cannot fetch region from load balancers')
    }
    return matches[1]
  }
}
