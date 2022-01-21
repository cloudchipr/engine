import { fromIni } from '@aws-sdk/credential-providers'
import { CredentialProvider } from '@aws-sdk/types'
import fs from 'fs'
import { v4 } from 'uuid'
import { Alb } from '../../domain/types/aws/alb'
import { Eip } from '../../domain/types/aws/eip'
import { Elb } from '../../domain/types/aws/elb'
import { Nlb } from '../../domain/types/aws/nlb'
import { Rds } from '../../domain/types/aws/rds'
import { EngineRequest } from '../../engine-request'
import { MetricsHelper } from '../../helpers/metrics-helper'
import { TagsHelper } from '../../helpers/tags-helper'
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

      const dir: string = `./.c8r/subCommand_${v4()}.json`
      await fs.promises.writeFile(dir, JSON.stringify(response), 'utf8')

      const items = awsClient.formatResponse(response)
      return awsClient.generateResponse<Type>(items)
    }

    private async generateElbResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const elbItems = responseJson
        .map(
          (elbResponseItemJson: {
                    LoadBalancerName: string;
                    DNSName: string;
                    CreatedTime: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                    C8rAccount: string|undefined;
                }) => {
            return new Elb(
              elbResponseItemJson.LoadBalancerName,
              elbResponseItemJson.DNSName,
              elbResponseItemJson.CreatedTime,
              TagsHelper.getNameTagValue(elbResponseItemJson.Tags),
              elbResponseItemJson.C8rRegion,
              elbResponseItemJson.C8rAccount
            )
          }
        )

      // await this.awsPriceCalculator.putElbPrices(elbItems)
      return new Response<Type>(elbItems)
    }

    private async generateNlbResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const nlbItems = responseJson
        .map(
          (elbResponseItemJson: {
                    LoadBalancerName: string;
                    DNSName: string;
                    CreatedTime: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                    C8rAccount: string|undefined;
                }) => {
            return new Nlb(
              elbResponseItemJson.LoadBalancerName,
              elbResponseItemJson.DNSName,
              elbResponseItemJson.CreatedTime,
              TagsHelper.getNameTagValue(elbResponseItemJson.Tags),
              elbResponseItemJson.C8rRegion,
              elbResponseItemJson.C8rAccount
            )
          }
        )

      // await this.awsPriceCalculator.putElbPrices(nlbItems)
      return new Response<Type>(nlbItems)
    }

    private async generateAlbResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const albItems = responseJson
        .map(
          (elbResponseItemJson: {
                    LoadBalancerName: string;
                    DNSName: string;
                    CreatedTime: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                    C8rAccount: string|undefined;
                }) => {
            return new Alb(
              elbResponseItemJson.LoadBalancerName,
              elbResponseItemJson.DNSName,
              elbResponseItemJson.CreatedTime,
              TagsHelper.getNameTagValue(elbResponseItemJson.Tags),
              elbResponseItemJson.C8rRegion,
              elbResponseItemJson.C8rAccount
            )
          }
        )

      // await this.awsPriceCalculator.putElbPrices(albItems)
      return new Response<Type>(albItems)
    }

    private async generateEipResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const eipItems = responseJson
        .map(
          (eipResponseItemJson: {
                    PublicIp: string;
                    Price: string;
                    NetworkBorderGroup: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                    C8rAccount: string|undefined;
                }) => {
            return new Eip(
              eipResponseItemJson.PublicIp,
              eipResponseItemJson.NetworkBorderGroup,
              TagsHelper.getNameTagValue(eipResponseItemJson.Tags),
              eipResponseItemJson.C8rRegion,
              eipResponseItemJson.C8rAccount
            )
          }
        )

      // await this.awsPriceCalculator.putEipPrices(eipItems)
      return new Response<Type>(eipItems)
    }

    private async generateRdsResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const rdsItems = responseJson
        .map(
          (rdsResponseItemJson: {
                    DBInstanceIdentifier: string;
                    DBInstanceClass: string;
                    StorageType: string;
                    Engine: string;
                    MultiAZ: boolean;
                    InstanceCreateTime: string;
                    'c7n.metrics': any;
                    AvailabilityZone: string;
                    Tags: any[];
                    C8rRegion: string|undefined;
                    C8rAccount: string|undefined;
                }) => {
            return new Rds(
              rdsResponseItemJson.DBInstanceIdentifier,
              rdsResponseItemJson.DBInstanceClass,
              rdsResponseItemJson.StorageType,
              MetricsHelper.getDatabaseConnections(rdsResponseItemJson),
              MetricsHelper.getDatabaseIOPS(rdsResponseItemJson),
              rdsResponseItemJson.Engine,
              rdsResponseItemJson.MultiAZ,
              rdsResponseItemJson.InstanceCreateTime,
              rdsResponseItemJson.AvailabilityZone,
              TagsHelper.getNameTagValue(rdsResponseItemJson.Tags),
              rdsResponseItemJson.C8rRegion,
              rdsResponseItemJson.C8rAccount
            )
          }
        )

      // await this.awsPriceCalculator.putRdsPrices(rdsItems)
      return new Response<Type>(rdsItems)
    }
}
