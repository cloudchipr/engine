import { DescribeDBInstancesCommandOutput } from '@aws-sdk/client-rds'
import { CredentialProvider } from '@aws-sdk/types'
import { Response } from '../../../responses/response'

export interface AwsClientInterface {
  getCommands (credentialProvider: CredentialProvider, region: string): any[]

  formatResponse<Type> (response: DescribeDBInstancesCommandOutput[]): Response<Type>
}
