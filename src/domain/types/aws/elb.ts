import { ProviderResource } from '../provider-resource'
import { Tag } from '../../tag'

export class Elb extends ProviderResource {
  protected readonly REGION_FETCH_REGEXP = /.*\.(.*)\.elb\.amazonaws\.com/;
  constructor (
    readonly loadBalancerName: string,
    readonly dnsName: string,
    readonly loadBalancerArn?: string,
    readonly age?: string,
    readonly type?: string,
    public hasAttachments?: boolean,
    public nameTag?: string,
    public tags?: Tag[],
    readonly _account?: string
  ) {
    super()
  }

  getIdentifierForNameTag (): string {
    if (this.type === 'classic') {
      return this.loadBalancerName
    }
    return this.loadBalancerArn ?? ''
  }

  getRegion (): string {
    const dnsAsArray = this.dnsName.split('.')
    if (dnsAsArray.length < 2) {
      throw new Error(`Cannot fetch region from load balancers ${this.dnsName}`)
    }
    const mergeResult = `${dnsAsArray[1]}.${dnsAsArray[2]}`
    return mergeResult.replace('elb.', '').replace('.elb', '')
  }

  getOwner (): string | undefined {
    return this._account
  }

  getId (): string {
    return this.getIdentifierForNameTag()
  }
}
