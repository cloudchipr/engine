import { CleanRequestResourceMetadataInterface } from './clean-request-resource-metadata-interface'

export interface CleanRequestResourceInterface {
  get id (): string
  get region (): string
  get metadata (): CleanRequestResourceMetadataInterface | undefined
}
