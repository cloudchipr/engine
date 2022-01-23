import {
  DescribeAddressesCommandOutput,
  DescribeInstancesCommandOutput,
  DescribeVolumesCommandOutput
} from '@aws-sdk/client-ec2'
import {
  DescribeLoadBalancersCommandOutput as V3CommandOutput
} from '@aws-sdk/client-elastic-load-balancing'
import {
  DescribeLoadBalancersCommandOutput as V2CommandOutput
} from '@aws-sdk/client-elastic-load-balancing-v2'
import {
  DescribeDBInstancesCommandOutput
} from '@aws-sdk/client-rds'

export type AwsClientCommandOutputTypeType =
  DescribeInstancesCommandOutput[] |
  DescribeVolumesCommandOutput[] |
  V3CommandOutput[] |
  V2CommandOutput[] |
  DescribeAddressesCommandOutput[] |
  DescribeDBInstancesCommandOutput[]
