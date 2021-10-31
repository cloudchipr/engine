export class Filter {
    public resource: string
    public op: string
    public value: string
    public since: string

    constructor (resource: string, op: string, value: string, since: string) {
      this.resource = resource
      this.op = op
      this.value = value
      this.since = since
    }
}
