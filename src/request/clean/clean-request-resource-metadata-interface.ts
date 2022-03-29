export interface CleanAwsElbMetadataInterface {
  loadBalancerArn?: string;
  type: string;
}

export interface CleanAwsEipMetadataInterface {
  allocationId?: string
  domain: string;
}

export interface CleanGcpVmDisksMetadataInterface {
  zone: string;
}

export interface CleanGcpLbEipMetadataInterface {
  global: boolean;
  region?: string;
}

export type CleanRequestResourceMetadataInterface =
  | CleanAwsEipMetadataInterface
  | CleanAwsElbMetadataInterface
  | CleanGcpVmDisksMetadataInterface
  | CleanGcpLbEipMetadataInterface
