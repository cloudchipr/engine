export enum Operators {
  Equal = 'eq',
  NotEqual = 'neq',
  GreaterThan = 'gt',
  GreaterThanEqualTo = 'ge',
  LessThan = 'lt',
  LessThanEqualTo = 'le',
  IsEmpty = 'isEmpty',
  IsAbsent = 'isAbsent',
  IsNotEmpty = 'isNotEmpty',
  IsNotAbsent = 'isNotAbsent',
  In = 'in',
  NotIn = 'ni',
  Exists = 'exists',
  Contains = 'contains'
}

export function getOppositeOperator (operator: string): string {
  switch (operator) {
    case Operators.Equal:
      return Operators.NotEqual
    case Operators.NotEqual:
      return Operators.Equal
    case Operators.GreaterThan:
      return Operators.LessThan
    case Operators.GreaterThanEqualTo:
      return Operators.LessThanEqualTo
    case Operators.LessThan:
      return Operators.GreaterThan
    case Operators.LessThanEqualTo:
      return Operators.GreaterThanEqualTo
    default:
      throw new Error(`The opposite operator of [${operator}] is not available.`)
  }
}
