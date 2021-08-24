export class Configuration {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  region: string = 'us-west-1';

  // ....list all options

  constructor(accessKeyId: string, secretAccessKey: string, region?: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    if (region) {
      this.region = region;
    }
  }
}
