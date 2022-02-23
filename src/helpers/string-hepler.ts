export class StringHelper {
  public static capitalizeFirstLetter (str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  public static splitAndGetAtIndex (str?: string, pattern?: string, index: number = 0): string | undefined {
    if (str === undefined) {
      return undefined
    }
    if (pattern === undefined) {
      return str
    }
    const array = str.split(pattern)
    if (index < 0) {
      index = array.length + index
    }
    return array[index] ?? ''
  }
}
