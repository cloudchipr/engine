import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Lb extends ProviderResource {
  constructor (
    readonly name: string,
    readonly type?: string,
    readonly global?: boolean,
    readonly age?: string,
    readonly region?: string,
    readonly labels?: Label[],
    readonly project?: string
  ) { super(region || '', project) }
}
