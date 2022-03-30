import { Operators } from './operators'
import { FilterInterface } from '../filter-interface'
import { FilterBuilderInterface } from '../filter-builder-interface'
import { Statistics } from '../domain/statistics'

export class FilterExpression implements FilterInterface {
  public resource: string;
  public operator: Operators;
  public value?: string;
  public since?: string;
  public statistics?: Statistics;

  constructor (
    field: string,
    operator: Operators,
    value?: string,
    since?: string,
    statistics?: Statistics
  ) {
    this.resource = field
    this.operator = operator
    this.value = value
    this.since = since
    this.statistics = statistics ?? Statistics.Maximum
  }

  public build (builder: FilterBuilderInterface): object {
    return builder.buildFilterExpression(this)
  }

  isEmpty (): boolean {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getFilterExpressionByResource (resource: string): FilterExpression | undefined {
    return undefined
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public replaceFilterExpressionByResource (resource: string, newFilterExpression: FilterExpression): void {
    return undefined
  }
}
