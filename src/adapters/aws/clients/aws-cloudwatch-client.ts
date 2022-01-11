// import { CredentialProvider } from '@aws-sdk/types'
// import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
//
// export default class AwsCloudWatchClient {
//     private readonly credentialProvider: CredentialProvider;
//
//     constructor (credentialProvider: CredentialProvider) {
//       this.credentialProvider = credentialProvider
//     }
//
//     getMetricsStatistics () {
//
//     }
//
//     private getClient (region: string): CloudWatchClient {
//       return new CloudWatchClient({
//         credentials: this.credentialProvider,
//         region
//       })
//     }
// }
