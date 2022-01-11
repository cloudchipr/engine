import { EngineInterface } from '../engine-interface'
import { Ebs } from '../../domain/types/aws/ebs'
import { EngineRequest } from '../../engine-request'
import { Response } from '../../responses/response'
import { Ec2 } from '../../domain/types/aws/ec2'
import { Elb } from '../../domain/types/aws/elb'
import { Eip } from '../../domain/types/aws/eip'
import { Alb } from '../../domain/types/aws/alb'
import { Nlb } from '../../domain/types/aws/nlb'
import { Rds } from '../../domain/types/aws/rds'
import { TagsHelper } from '../../helpers/tags-helper'
import { MetricsHelper } from '../../helpers/metrics-helper'
import AwsPriceCalculator from './aws-price-calculator'
import { AwsSubCommand } from '../../aws-sub-command'
import { Command } from '../../command'
import { fromIni } from '@aws-sdk/credential-providers'
import AwsOrganisationClient from './aws-organisation-client'
import AwsAccountClient from './aws-account-client'
import { AWSConfiguration } from './aws-configuration'
import AwsEc2Client from './clients/aws-ec2-client'

interface TargetGroup {
    LoadBalancerArns: string[]
    TargetHealthDescriptions: object[]
    C8rRegion: string|undefined
}

export class AWSSDKEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly awsPriceCalculator: AwsPriceCalculator;
    private readonly awsOrganisationClient: AwsOrganisationClient;
    private readonly awsAccountClient: AwsAccountClient;
    private readonly awsEc2: AwsEc2Client;
    private readonly awsConfiguration?: AWSConfiguration;

    constructor (awsConfiguration?: AWSConfiguration) {
      const credentialProvider = awsConfiguration?.credentialProvider ?? fromIni()

      this.awsPriceCalculator = new AwsPriceCalculator(credentialProvider)
      this.awsOrganisationClient = new AwsOrganisationClient(credentialProvider)
      this.awsAccountClient = new AwsAccountClient(credentialProvider)
      this.awsEc2 = new AwsEc2Client(credentialProvider)
      this.awsConfiguration = awsConfiguration
    }

    async execute (request: EngineRequest): Promise<Response<Type>> {
      const command = request.command.getValue()
      const subCommand = request.subCommand.getValue()

      const generateResponseMethodName = AWSSDKEngineAdapter.getResponseMethodName(subCommand)
      this.validateRequest(generateResponseMethodName)

      const [currentAccount, accounts] = await this.getCurrentAndPossibleAllAccounts(request.parameter.accounts)

      const response = await Promise.all(this.awsEc2.describeInstances(request.parameter.regions))

        // console.log(response.filter( (e) => e.Reservations.length ).map((r) => {
        //     return r.Reservations.map((i) => { return this.generateEc2Response(i.Instances) })
        // }))

      return response.filter( (e) => e.Reservations.length ).map((r) => {
          return r.Reservations.map((i) => {
              return this.generateEc2Response(i.Instances)
          })
      })
    }

    private validateRequest (name: string) {
      if (typeof (this as any)[name] !== 'function') {
        throw Error('Invalid AWS subcommand provided: ' + name)
      }
    }

    private static getResponseMethodName (subCommand: string): string {
      return `generate${AWSSDKEngineAdapter.capitalizeFirstLetter(subCommand)}Response`
    }

    private static capitalizeFirstLetter (str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1)
    }

    private async getCurrentAndPossibleAllAccounts (requestedAccounts: string[]): Promise<[string | undefined, string[]]> {
      const currentAccount: string | undefined = await this.awsAccountClient.getCurrentAccount()
      if (requestedAccounts.length > 0 && requestedAccounts.includes('all')) {
        requestedAccounts = await this.awsOrganisationClient.getAllAccounts()
      }
      return [currentAccount, requestedAccounts]
    }

    private async generateEbsResponse (
      responseJson: any
    ): Promise<Response<Type>> {
      const ebsItems = responseJson.map(
        (ebsResponseItemJson: {
                VolumeId: string;
                Size: number;
                State: string;
                VolumeType: string;
                CreateTime: string;
                AvailabilityZone: string;
                Tags: any[];
                C8rRegion: string|undefined;
                C8rAccount: string|undefined;
            }) => {
          return new Ebs(
            ebsResponseItemJson.VolumeId,
            ebsResponseItemJson.Size,
            ebsResponseItemJson.State,
            ebsResponseItemJson.VolumeType,
            ebsResponseItemJson.AvailabilityZone,
            ebsResponseItemJson.CreateTime,
            TagsHelper.getNameTagValue(ebsResponseItemJson.Tags),
            ebsResponseItemJson.C8rRegion,
            ebsResponseItemJson.C8rAccount
          )
        }
      )

      await this.awsPriceCalculator.putEbsPrices(ebsItems)
      return new Response<Type>(ebsItems)
    }

    private generateEc2Response (
      responseJson: any
    ): Response<Type> {
      const ec2Items = responseJson.map(
        (ec2ResponseItemJson: {
                InstanceId: string;
                InstanceType: string;
                ImageId: string;
                SpotInstanceRequestId: string|undefined;
                Cpu: string;
                NetworkIn: string;
                NetworkOut: string;
                LaunchTime: string;
                Tags: any[];
                Placement: { Tenancy: string, AvailabilityZone: string };
                PlatformDetails: string;
                UsageOperation: string
            }) => {
          return new Ec2(
            ec2ResponseItemJson.InstanceId,
            ec2ResponseItemJson.ImageId,
            ec2ResponseItemJson.InstanceType,
            ec2ResponseItemJson.LaunchTime,
            ec2ResponseItemJson.Placement.Tenancy,
            ec2ResponseItemJson.Placement.AvailabilityZone,
            ec2ResponseItemJson.SpotInstanceRequestId !== undefined,
            ec2ResponseItemJson.PlatformDetails,
            ec2ResponseItemJson.UsageOperation,
            TagsHelper.getNameTagValue(ec2ResponseItemJson.Tags)
          )
        }
      )

      //await this.awsPriceCalculator.putEc2Prices(ec2Items)
      return new Response<Type>(ec2Items)
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

      await this.awsPriceCalculator.putElbPrices(elbItems)
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

      await this.awsPriceCalculator.putElbPrices(nlbItems)
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

      await this.awsPriceCalculator.putElbPrices(albItems)
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

      await this.awsPriceCalculator.putEipPrices(eipItems)
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

      await this.awsPriceCalculator.putRdsPrices(rdsItems)
      return new Response<Type>(rdsItems)
    }
}
