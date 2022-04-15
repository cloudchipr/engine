interface VmRamAndCpu {
  ram: number;
  cpu: number
}

export class GcpPriceCalculatorHelper {
  static getVmRamAndCpu (machineType: string): VmRamAndCpu {
    const series = machineType.split('-')[0].toLowerCase()
    const type = machineType.split('-')[1].toLowerCase()
    const cpu = parseFloat(machineType.split('-')[2] ?? '0')
    if (['e2', 'n2', 'n2d', 'c2', 'c2d', 'm1', 'm2'].includes(series)) {
      switch (type) {
        case 'micro':
          return { ram: 1, cpu: 0.25 }
        case 'small':
          return { ram: 2, cpu: 0.5 }
        case 'medium':
          return { ram: 4, cpu: 2 }
        case 'standard':
          return { ram: cpu * 4, cpu: cpu }
        case 'highmem':
          return { ram: cpu * 8, cpu: cpu }
        case 'highcpu':
          return { ram: cpu * (series === 'c2d' ? 2 : 1), cpu: cpu }
        case 'megamem':
          return { ram: cpu * (series === 'm1' ? 14.9 : 14), cpu: cpu }
        case 'ultramem':
          return { ram: cpu * (series === 'm1' ? 24 : 28.3), cpu: cpu }
      }
    } else if (series === 'n1') {
      switch (type) {
        case 'standard':
          return { ram: cpu * 3.75, cpu: cpu }
        case 'highmem':
          return { ram: cpu * 6.5, cpu: cpu }
        case 'highcpu':
          return { ram: cpu * 0.9, cpu: cpu }
      }
    } else if (series === 'f1') {
      return { ram: 0.6, cpu: 1 }
    } else if (series === 'g1') {
      return { ram: 1.7, cpu: 1 }
    } else if (series === 'custom') {
      return { ram: cpu / 1024, cpu: parseInt(type) }
    }
    throw new Error(`Good message!`)
  }
}
