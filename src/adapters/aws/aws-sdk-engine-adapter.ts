import { fromIni } from '@aws-sdk/credential-providers'
import { CredentialProvider } from '@aws-sdk/types'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { AWSConfiguration } from './aws-configuration'
import AwsClient from './clients/aws-client'

export class AWSSDKEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly credentials: CredentialProvider

    constructor (awsConfiguration?: AWSConfiguration) {
      this.credentials = awsConfiguration?.credentialProvider ?? fromIni()
    }

    async execute (request: EngineRequest): Promise<Response<Type>> {
      const subCommand = request.subCommand.getValue()

      const awsClient = new AwsClient(subCommand, this.credentials)
      const response = await Promise.all(awsClient.getResources(request.parameter.regions))

      const formattedResponse = await awsClient.formatResponse<Type>(response)
      return awsClient.getAdditionalDataForFormattedResponse(formattedResponse)
    }
}
