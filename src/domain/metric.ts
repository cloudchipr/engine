import { Statistics } from './statistics'

export class Metric {
  constructor (readonly Value: number, readonly Type: Statistics, readonly Unit: string) {
    this.Value = Value
    this.Type = Type
    this.Unit = Unit
  }
}
