export class Filter {
    public resource: string
    public op: string
    public value: string
    public since: string
    public statistics: string

    constructor (resource: string, op: string, value: string, since: string, statistics: string) {
      this.resource = resource
      this.op = op
      this.value = value
      this.since = since
      this.statistics = statistics
    }
}
