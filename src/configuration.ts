export class Configuration {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly region: string;

  // ....list all options

  constructor (accessKeyId: string, secretAccessKey: string, region: string) {
    this.accessKeyId = accessKeyId
    this.secretAccessKey = secretAccessKey
    this.region = region
  }
}
