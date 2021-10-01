import { EngineResponse } from '@root/engine-response'
import { EngineRequest } from '@root/engine-request'

export interface EngineInterface {
  execute(request: EngineRequest): EngineResponse;
}
