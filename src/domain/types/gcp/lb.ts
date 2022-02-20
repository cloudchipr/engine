export class Lb {
  constructor (
    readonly name: string,
    readonly protocol: string,
    readonly region?: string
  ) {}
}
