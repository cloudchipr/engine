import { CachingType } from '../domain/types/common/caching-type'

export interface CachingInterface {
  get (key: string): Promise<CachingType>

  set (key: string, list: CachingType): Promise<void>
}
