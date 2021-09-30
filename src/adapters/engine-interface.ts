import { EngineResponse } from '../engine-response'
import { EngineRequest } from '../engine-request'

export interface EngineInterface {
  execute(request: EngineRequest): EngineResponse;
}
