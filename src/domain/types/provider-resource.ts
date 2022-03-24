export abstract class ProviderResource {
    protected _pricePerHour?: number;
    protected _pricePerMonthGB?: number;
    protected _pricePerMonth?: number;

    get pricePerHour (): number {
      return <number> this._pricePerHour
    }

    set pricePerHour (value: number) {
      this._pricePerHour = value
      if (this._pricePerHour !== null) {
        this._pricePerMonth = this._pricePerHour * 720
      }
    }

    set pricePerMonthGB (value: number) {
      this._pricePerMonthGB = value * 1
    }

    get pricePerMonthGB (): number {
      return <number> this._pricePerMonthGB
    }

    set pricePerMonth (value: number) {
      this._pricePerMonth = value
    }

    get pricePerMonth (): number {
      return <number> this._pricePerMonth
    }

    abstract getOwner(): string

    abstract getRegion(): string
}
