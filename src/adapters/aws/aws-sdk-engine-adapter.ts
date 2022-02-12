import { fromIni } from '@aws-sdk/credential-providers'
import { CredentialProvider } from '@aws-sdk/types'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { AWSConfiguration } from './aws-configuration'
import AwsClient from './clients/aws-client'
import { Command } from '../../command'

export class AWSSDKEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly credentials: CredentialProvider

    constructor (awsConfiguration?: AWSConfiguration) {
      this.credentials = awsConfiguration?.credentialProvider ?? fromIni()
    }

    async execute (request: EngineRequest): Promise<Response<Type>> {
      const awsClient = new AwsClient(request.subCommand.getValue(), this.credentials)
      switch (request.command.getValue()) {
        case Command.COLLECT_COMMAND:
          return awsClient.collectResources(request.parameter.regions)
        case Command.CLEAN_COMMAND:
          return awsClient.collectResources(request.parameter.regions)
        default:
          throw new Error(`Invalid command ${request.command.getValue()} provided.`)
      }
    }
}
