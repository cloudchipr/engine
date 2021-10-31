import ProviderResource from '../provider-resource'

export class Alb extends ProviderResource {
  constructor (
    readonly dnsName: string,
    readonly age?: string,
    readonly nameTag?: string
  ) {
    super()
  }
}
