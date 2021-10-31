import { EngineRequest } from '../engine-request'
import { Response } from '../responses/response'

export interface EngineInterface<Type> {
   execute (request: EngineRequest): Promise<Response<Type>>;
}
