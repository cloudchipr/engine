import { Response } from '../../../responses/response'
import { CleanRequestResourceInterface } from '../../../request/clean/clean-request-resource-interface'
import { Disks } from '../../../domain/types/gcp/disks'
import { Vm } from '../../../domain/types/gcp/vm'
import { Eip } from '../../../domain/types/gcp/eip'
import { Lb } from '../../../domain/types/gcp/lb'
import { Sql } from '../../../domain/types/gcp/sql'

export interface GcpClientInterface {
  collectAll (): Promise<Response<Disks | Vm | Eip | Lb | Sql>>

  clean (request: CleanRequestResourceInterface): Promise<any>

  isCleanRequestValid (request: CleanRequestResourceInterface): boolean
}
