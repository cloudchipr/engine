import { ProviderResource } from '../provider-resource'

export class Elb extends ProviderResource {
  constructor (
        readonly dnsName: string,
        readonly age?: string,
        readonly nameTag?: string
  ) {
    super()
  }
}
