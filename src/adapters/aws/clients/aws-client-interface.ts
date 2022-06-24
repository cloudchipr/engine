import { Response } from '../../../responses/response'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { Ebs } from '../../../domain/types/aws/ebs'
import { Ec2 } from '../../../domain/types/aws/ec2'
import { Eip } from '../../../domain/types/aws/eip'
import { Rds } from '../../../domain/types/aws/rds'
import { Elb } from '../../../domain/types/aws/elb'

export interface AwsClientInterface {
  collectAll (regions: string[]): Promise<Response<Ebs | Ec2 | Eip | Rds | Elb>>

  clean (request: CleanRequestResourceInterface): Promise<any>

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean

  getRateLimit (): number
}
