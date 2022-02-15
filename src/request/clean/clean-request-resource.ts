import { CleanRequestResourceMetadataInterface } from './interface/clean-request-resource-metadata-interface'
import { CleanRequestResourceInterface } from './interface/clean-request-resource-interface'

export class CleanRequestResource implements CleanRequestResourceInterface {
  constructor (
    private readonly _id: string,
    private readonly _region: string,
    private readonly _metadata?: CleanRequestResourceMetadataInterface
  ) {}

  get id (): string {
    return this._id
  }

  get region (): string {
    return this._region
  }

  get metadata (): CleanRequestResourceMetadataInterface | undefined {
    return this._metadata
  }
}
