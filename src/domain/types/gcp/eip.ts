import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Eip extends ProviderResource {
  constructor (
    readonly ip: string,
    readonly name?: string,
    readonly region?: string,
    readonly labels?: Label[],
    readonly project?: string
  ) { super(region || '', project) }
}
