import { EngineInterface } from '../engine-interface'
import * as policies from '../../policy.json'
import { Ebs } from '../../domain/types/aws/ebs'
import { EngineRequest } from '../../engine-request'
import { C7nFilterBuilder } from '../../filters/c7n-filter-builder'
import { C7nExecutor } from '../../c7n-executor'
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

interface TargetGroup {
    LoadBalancerArns: string[]
    TargetHealthDescriptions: object[]
    C8rRegion: string|undefined
}

export class AWSShellEngineAdapter<Type> implements EngineInterface<Type> {
    private readonly custodianExecutor: C7nExecutor;
    private readonly awsPriceCalculator: AwsPriceCalculator;
    private readonly awsOrganisationClient: AwsOrganisationClient;
    private readonly awsAccountClient: AwsAccountClient;
    private readonly awsConfiguration?: AWSConfiguration;

    constructor (custodian: string, custodianOrg?: string, awsConfiguration?: AWSConfiguration) {
      const credentialProvider = awsConfiguration?.credentialProvider ?? fromIni()

      this.custodianExecutor = new C7nExecutor(custodian, custodianOrg)
      this.awsPriceCalculator = new AwsPriceCalculator(credentialProvider)
      this.awsOrganisationClient = new AwsOrganisationClient(credentialProvider)
      this.awsAccountClient = new AwsAccountClient(credentialProvider)
      this.awsConfiguration = awsConfiguration
    }

    async execute (request: EngineRequest): Promise<Response<Type>> {
      const command = request.command.getValue()
      const subCommand = request.subCommand.getValue()

      const generateResponseMethodName = AWSShellEngineAdapter.getResponseMethodName(subCommand)
      this.validateRequest(generateResponseMethodName)

      const [currentAccount, accounts] = await this.getCurrentAndPossibleAllAccounts(request.parameter.accounts)

      let policyName: string, policy: any
      if (!request.parameter.filter.isEmpty() && command === Command.COLLECT_COMMAND && (subCommand === AwsSubCommand.nlb().getValue() || subCommand === AwsSubCommand.alb().getValue())) {
        [policyName, policy] = await this.getElbPolicy(request, currentAccount, accounts)
      } else {
        [policyName, policy] = this.getDefaultPolicy(request)
        const filters: object = request.parameter.filter?.build(new C7nFilterBuilder(request.command, request.subCommand))

        if (filters && Object.keys(filters).length) {
          if (typeof policy.policies[0].filters === 'undefined') {
            policy.policies[0].filters = []
          }
          policy.policies[0].filters.push(filters)
        }
      }

      // execute custodian command and return response
      const response = await this.executeC7nPolicy(policy, policyName, request, currentAccount, accounts)
      return (this as any)[generateResponseMethodName](response)
    }

    private executeC7nPolicy (policy: string, policyName: string, request: EngineRequest, currentAccount: string| undefined, accounts: string[]) {
      return this.custodianExecutor.execute(
        policy,
        policyName,
        request.parameter.regions,
        currentAccount,
        accounts,
        request.isDebugMode,
        request.outputDirectory,
        this.awsConfiguration
      )
    }

    private getDefaultPolicy (request: EngineRequest) : [string, any] {
      const policyName = `${request.subCommand.getValue()}-${request.command.getValue()}`

      const policy: any = this.getPolicy(policyName)
      AWSShellEngineAdapter.validatePolicyName(policyName)

      return [policyName, policy]
    }

    private async getElbPolicy (request: EngineRequest, currentAccount: string| undefined, accounts: string[]) : Promise<[string, any]> {
      const policyName = 'target-group-collect'
      const policy: any = this.getPolicy(policyName)

      const targetGroups = <Array<TargetGroup>><unknown> await this.executeC7nPolicy(policy, policyName, request, currentAccount, accounts)

      const allElbPolicyName = request.subCommand.getValue() + '-collect-all'
      const allElbPolicy: any = this.getPolicy(allElbPolicyName)

      const allElb = <Array<{ LoadBalancerArn: string }>><unknown> await this.executeC7nPolicy(allElbPolicy, allElbPolicyName, request, currentAccount, accounts)
      const potentialGarbageELB = new Set<string>()

      allElb.forEach(elb => {
        potentialGarbageELB.add(elb.LoadBalancerArn)
      })

      targetGroups.forEach(targetGroup => {
        targetGroup.LoadBalancerArns.forEach((elbArn: string) => {
          if (targetGroup.TargetHealthDescriptions.length !== 0) {
            potentialGarbageELB.delete(elbArn)
          }
        })
      })

      const elbPolicyName = request.subCommand.getValue() + '-collect-by-instance'

      // @ts-ignore
      const elbPolicy: any = Object.assign({}, policies[elbPolicyName])
      elbPolicy.policies[0].filters[1].and[0].value = '"[' + Array.from(potentialGarbageELB).map(x => "'" + x + "'").join(',') + ']"'

      return [elbPolicyName, elbPolicy]
    }

    private validateRequest (name: string) {
      if (typeof (this as any)[name] !== 'function') {
        throw Error('Invalid AWS subcommand provided: ' + name)
      }
    }

    private static validatePolicyName (policy: string) {
      if (!(policy in policies)) {
        throw new Error(`Invalid policy name provided: ${policy}`)
      }
    }

    private static getResponseMethodName (subCommand: string): string {
      return `generate${AWSShellEngineAdapter.capitalizeFirstLetter(subCommand)}Response`
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
            false,
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

    private async generateEc2Response (
      responseJson: any
    ): Promise<Response<Type>> {
      const ec2Items = responseJson.map(
        (ec2ResponseItemJson: {
                InstanceId: string;
                ImageId: string;
                InstanceType: string;
                SpotInstanceRequestId: string|undefined;
                PlatformDetails: string;
                UsageOperation: string
                Cpu: string;
                NetworkIn: string;
                NetworkOut: string;
                LaunchTime: string;
                Tags: any[];
                Placement: { Tenancy: string, AvailabilityZone: string };
                C8rRegion: string|undefined;
                C8rAccount: string|undefined;
            }) => {
          return new Ec2(
            ec2ResponseItemJson.InstanceId,
            ec2ResponseItemJson.ImageId,
            ec2ResponseItemJson.InstanceType,
            MetricsHelper.getCpuUtilization(ec2ResponseItemJson),
            MetricsHelper.getNetworkIn(ec2ResponseItemJson),
            MetricsHelper.getNetworkOut(ec2ResponseItemJson),
            ec2ResponseItemJson.LaunchTime,
            ec2ResponseItemJson.Placement.Tenancy,
            ec2ResponseItemJson.Placement.AvailabilityZone,
            ec2ResponseItemJson.SpotInstanceRequestId !== undefined,
            ec2ResponseItemJson.PlatformDetails,
            ec2ResponseItemJson.UsageOperation,
            undefined,
            TagsHelper.getNameTagValue(ec2ResponseItemJson.Tags),
            ec2ResponseItemJson.C8rRegion,
            ec2ResponseItemJson.C8rAccount
          )
        }
      )

      await this.awsPriceCalculator.putEc2Prices(ec2Items)
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
              undefined,
              elbResponseItemJson.CreatedTime,
              'classic',
              false,
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
              '',
              elbResponseItemJson.CreatedTime,
              'network',
              false,
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
              '',
              elbResponseItemJson.CreatedTime,
              'application',
              false,
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
              undefined,
              TagsHelper.getNameTagValue(rdsResponseItemJson.Tags),
              rdsResponseItemJson.C8rRegion,
              rdsResponseItemJson.C8rAccount
            )
          }
        )

      await this.awsPriceCalculator.putRdsPrices(rdsItems)
      return new Response<Type>(rdsItems)
    }

    private getPolicy (policyName: string) {
      // @ts-ignore
      return JSON.parse(JSON.stringify(Object.assign({}, policies[policyName])))
    }
}
