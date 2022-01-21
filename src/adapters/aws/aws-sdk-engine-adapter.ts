import { fromIni } from '@aws-sdk/credential-providers'
import { CredentialProvider } from '@aws-sdk/types'
import fs from 'fs'
import { v4 } from 'uuid'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { AWSConfiguration } from './aws-configuration'
import AwsClient from './clients/aws-client'

export class AWSSDKEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly credentials: CredentialProvider;

    constructor (awsConfiguration?: AWSConfiguration) {
      this.credentials = awsConfiguration?.credentialProvider ?? fromIni()
    }

    async execute (request: EngineRequest): Promise<Response<Type>> {
      const subCommand = request.subCommand.getValue()

      const awsClient = new AwsClient(subCommand)
      const response = await Promise.all(awsClient.getResources(this.credentials, request.parameter.regions))

      const dir: string = `./.c8r/${subCommand}_${v4()}.json`
      await fs.promises.writeFile(dir, JSON.stringify(response), 'utf8')

      return awsClient.formatResponse<Type>(response)
    }
}
