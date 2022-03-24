export abstract class ProviderResource {
    protected _pricePerHour?: number;
    protected _pricePerMonthGB?: number;
    protected _pricePerMonth?: number;
    protected _region: string;
    protected _owner?: string;

    protected constructor (
      region: string,
      owner?: string
    ) {
      this._region = region
      this._owner = owner
    }

    get pricePerHour (): number | undefined {
      return this._pricePerHour
    }

    set pricePerHour (value: number | undefined) {
      this._pricePerHour = value
      if (value !== undefined) {
        this._pricePerMonth = value * 720
      }
    }

    set pricePerMonthGB (value: number | undefined) {
      this._pricePerMonthGB = value
    }

    get pricePerMonthGB (): number | undefined {
      return this._pricePerMonthGB
    }

    set pricePerMonth (value: number | undefined) {
      this._pricePerMonth = value
    }

    get pricePerMonth (): number | undefined {
      return this._pricePerMonth
    }

    getOwner (): string | undefined {
      return this._owner
    }

    getRegion (): string {
      return this._region
    }
}
