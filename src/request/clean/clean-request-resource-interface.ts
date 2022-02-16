import { CleanRequestResourceMetadataInterface } from './clean-request-resource-metadata-interface'

export interface CleanRequestResourceInterface {
  id: string
  region: string
  metadata?: CleanRequestResourceMetadataInterface
}
