export class Filter {
    public resource: string
    public op: string
    public since: string
    public value: string

    constructor (resource: string, op: string, since: string, value: string) {
      this.resource = resource
      this.op = op
      this.since = since
      this.value = value
    }
}
