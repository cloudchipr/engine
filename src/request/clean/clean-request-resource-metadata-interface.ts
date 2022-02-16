export interface CleanElbMetadataInterface {
  loadBalancerArn?: string;
  type: string;
}

export interface CleanEipMetadataInterface {
  allocationId?: string
  domain: string;
}

export type CleanRequestResourceMetadataInterface =
  | CleanEipMetadataInterface
  | CleanElbMetadataInterface
