export class MetricsHelper {
  static getDatabaseConnections (object: any): number {
    return object?.['c7n.metrics']?.['AWS/RDS.DatabaseConnections.Average']?.[0]?.Average ?? 0
  }
}
