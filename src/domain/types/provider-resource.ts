export abstract class ProviderResource {
    protected _pricePerMonth?: number;

    set pricePerMonth (value: number) {
      this._pricePerMonth = value
    }

    get pricePerMonth (): number {
      return <number> this._pricePerMonth
    }

    abstract getOwner(): string

    abstract getRegion(): string
}
