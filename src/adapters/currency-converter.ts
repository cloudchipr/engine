export class CurrencyConverter {
  static CURRENCY = {
    USD: 'usd',
    CNY: 'cny'
  }

  static convertToUSD (fromCurrency: string, amount: number): number {
    switch (fromCurrency.toLowerCase()) {
      case CurrencyConverter.CURRENCY.CNY:
        return amount * 0.15
      default:
        return amount
    }
  }
}
