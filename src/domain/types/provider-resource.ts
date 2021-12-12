export abstract class ProviderResource {
    protected _pricePerHour?: number;
    protected _pricePerMonthGB?: number;
    protected _pricePerMonth?: number;
    protected _c8rRegion?: string|undefined;
    protected _c8rAccount?: string|undefined;

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

    get pricePerMonth (): number {
      return <number> this._pricePerMonth
    }

    get c8rRegion (): string | undefined {
      return this._c8rRegion
    }

    set c8rRegion (value: string | undefined) {
      this._c8rRegion = value
    }

    get c8rAccount (): string | undefined {
      return this._c8rAccount
    }

    abstract getRegion(): string
}
