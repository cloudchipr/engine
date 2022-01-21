import { DescribeInstancesCommandOutput, DescribeVolumesCommandOutput } from '@aws-sdk/client-ec2'
import AwsEbsClient from './clients/aws-ebs-client'
import AwsEc2Client from './clients/aws-ec2-client'

export type AwsClientType = AwsEc2Client | AwsEbsClient

export type CommandOutputType = DescribeInstancesCommandOutput[] | DescribeVolumesCommandOutput[]
