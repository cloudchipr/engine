export enum Statistics {
 Unspecified,
 Average = 'Average',
 Sum = 'Sum',
 Maximum = 'Maximum',
 Minimum = 'Minimum',
}

export function getGcpStatistics (statistic?: string): string {
  switch (statistic) {
    case Statistics.Maximum:
      return 'ALIGN_MAX'
    case Statistics.Minimum:
      return 'ALIGN_MIN'
    case Statistics.Sum:
      return 'ALIGN_SUM'
    case Statistics.Average:
      return 'ALIGN_MEAN'
    default:
      return 'ALIGN_NONE'
  }
}
