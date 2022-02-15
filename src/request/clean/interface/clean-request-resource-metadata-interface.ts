export interface CleanElbMetadataInterface {
  loadBalancerArn?: string;
  type: 'classic' | 'network' | 'application';
}

export interface CleanEipMetadataInterface {
  allocationId?: string
  domain: 'classic' | 'vpc';
}

export type CleanRequestResourceMetadataInterface =
  | CleanEipMetadataInterface
  | CleanElbMetadataInterface
