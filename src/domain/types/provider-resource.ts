export abstract class ProviderResource {
    protected _pricePerMonth?: number;

    set pricePerMonth (value: number | undefined) {
      this._pricePerMonth = value
    }

    get pricePerMonth (): number | undefined {
      return this._pricePerMonth
    }

    abstract getOwner(): string | undefined

    abstract getRegion(): string

    abstract getId(): string
}
