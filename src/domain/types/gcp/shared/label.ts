export class Label {
  constructor (readonly key: string, readonly value?: string) {
    this.key = key
    this.value = value
  }

  public static createInstances (labels?: {[K: string]: string | undefined}): Label[] {
    const result: Label[] = []
    if (labels === undefined) {
      return result
    }
    for (const [key, value] of Object.entries(labels)) {
      result.push(new Label(key, value))
    }
    return result
  }
}
