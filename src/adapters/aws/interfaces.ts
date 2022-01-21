import {
  DescribeAddressesCommand,
  DescribeAddressesCommandOutput,
  DescribeInstancesCommand,
  DescribeInstancesCommandOutput,
  DescribeVolumesCommand,
  DescribeVolumesCommandOutput,
  EC2Client
} from '@aws-sdk/client-ec2'
import {
  ElasticLoadBalancingClient,
  DescribeLoadBalancersCommandOutput,
  DescribeLoadBalancersCommand
} from '@aws-sdk/client-elastic-load-balancing'
import {
  DescribeDBInstancesCommand,
  DescribeDBInstancesCommandOutput,
  RDSClient
} from '@aws-sdk/client-rds'
import AwsEbsClient from './clients/aws-ebs-client'
import AwsEc2Client from './clients/aws-ec2-client'
import AwsEipClient from './clients/aws-eip-client'
import AwsElbClient from './clients/aws-elb-client'
import AwsRdsClient from './clients/aws-rds-client'

export type AwsClientImplementationType =
  AwsEc2Client |
  AwsEbsClient |
  AwsElbClient |
  AwsEipClient |
  AwsRdsClient

export type AwsClientType =
  EC2Client |
  ElasticLoadBalancingClient |
  RDSClient

export type AwsClientCommandType =
  DescribeInstancesCommand |
  DescribeVolumesCommand |
  DescribeLoadBalancersCommand |
  DescribeAddressesCommand |
  DescribeDBInstancesCommand

export type AwsClientCommandOutputTypeType =
  DescribeInstancesCommandOutput[] |
  DescribeVolumesCommandOutput[] |
  DescribeLoadBalancersCommandOutput[] |
  DescribeAddressesCommandOutput[] |
  DescribeDBInstancesCommandOutput[]
