import { EngineResponse } from '../EngineResponse';
import { EngineRequest } from '../EngineRequest';

export interface EngineInterface {
  execute(request: EngineRequest): EngineResponse;
}
