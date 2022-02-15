import { fromIni } from '@aws-sdk/credential-providers'
import { CredentialProvider } from '@aws-sdk/types'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { AWSConfiguration } from './aws-configuration'
import AwsClient from './clients/aws-client'
import { CleanRequest } from '../../request/clean/clean-request'
import { CleanResponse } from '../../responses/clean-response'

export class AWSSDKEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly credentials: CredentialProvider

    constructor (awsConfiguration?: AWSConfiguration) {
      this.credentials = awsConfiguration?.credentialProvider ?? fromIni()
    }

    async execute (request: EngineRequest): Promise<Response<Type>> {
      const awsClient = new AwsClient(request.subCommand.getValue(), this.credentials)
      return awsClient.collectResources<Type>(request)
    }

    clean (request: CleanRequest): Promise<CleanResponse> {
      const awsClient = new AwsClient(request.subCommand.getValue(), this.credentials)
      return awsClient.cleanResources(request)
    }
}
