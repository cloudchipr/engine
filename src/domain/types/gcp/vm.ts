import { Label } from './shared/label'

export class Vm {
  constructor (
    readonly name: string,
    readonly machineType?: string,
    readonly age?: string,
    readonly zone?: string,
    readonly cpu?: any,
    readonly networkIn?: any,
    readonly networkOut?: any,
    readonly pricePerMonth?: number,
    readonly labels?: Label[]
  ) {}
}
