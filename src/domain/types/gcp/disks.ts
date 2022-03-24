import { Label } from './shared/label'
import { ProviderResource } from '../provider-resource'

export class Disks extends ProviderResource {
  constructor (
    readonly name: string,
    readonly type?: string,
    readonly hasAttachments?: boolean,
    readonly status?: string,
    readonly size?: number,
    readonly age?: string,
    readonly zone?: string,
    readonly labels?: Label[],
    readonly project?: string
  ) { super(zone?.split('-').slice(0, -1).join('-') || '', project) }
}
