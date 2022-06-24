import { fromIni } from '@aws-sdk/credential-providers'
import { CredentialProvider } from '@aws-sdk/types'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { EngineInterface } from '../engine-interface'
import { AWSConfiguration } from './aws-configuration'
import AwsClient from './clients/aws-client'
import { CleanResponse } from '../../responses/clean-response'
import { CleanRequestInterface } from '../../request/clean/clean-request-interface'
import { Ebs } from '../../domain/types/aws/ebs'
import { Ec2 } from '../../domain/types/aws/ec2'
import { Eip } from '../../domain/types/aws/eip'
import { Rds } from '../../domain/types/aws/rds'
import { Elb } from '../../domain/types/aws/elb'

export class AWSSDKEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly credentials: CredentialProvider

    constructor (awsConfiguration?: AWSConfiguration) {
      this.credentials = awsConfiguration?.credentialProvider ?? fromIni()
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute (request: EngineRequest): Promise<Response<Type>> {
      return new Response<Type>([])
    }

    async collectAll (regions: string[]): Promise<Response<Ebs | Ec2 | Eip | Rds | Elb>[]> {
      const awsClient = new AwsClient(this.credentials)
      return awsClient.collectResources(regions)
    }

    async clean (request: CleanRequestInterface): Promise<CleanResponse> {
      const awsClient = new AwsClient(this.credentials)
      return awsClient.cleanResources(request)
    }
}
