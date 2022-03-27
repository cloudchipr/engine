import { Disks } from '../../domain/types/gcp/disks'
import fs from 'fs'
import { GcpSubCommand } from './gcp-sub-command'

interface Price {
  [key: string]: {
    name: string,
    description: string,
    prices: {
      [key: string]: number
    }
  }
}

export class GcpPriceCalculator {
  static async putDisksPrices (items: Disks[]): Promise<void> {
    const prices = await GcpPriceCalculator.loadPrices(GcpSubCommand.DISKS_SUBCOMMAND)
    items.forEach(item => {
      const priceGb = prices[item.type].prices[item.getRegion()]
      if (priceGb !== undefined) {
        item.pricePerMonth = priceGb * (item.size / 1073741824)
      }
    })
  }

  private static async loadPrices (resource: string): Promise<Price> {
    const filePath = `${__dirname}/../../../prices/gcp/${resource}.json`
    try {
      return JSON.parse(await fs.promises.readFile(filePath, 'utf8'))
    } catch (e) {
      throw new Error(`${filePath} file does not exist.`)
    }
  }
}
