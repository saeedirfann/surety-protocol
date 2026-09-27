export type PublicDeployment = {
  chainId: number;
  startBlock: number;
  registry: `0x${string}`;
  manager: `0x${string}`;
  token: `0x${string}`;
  oracle: `0x${string}`;
  identity: `0x${string}`;
  rpc: string;
};
export function parsePublicDeployment(serialized: string, rpcOverride?: string): PublicDeployment;
export function publicHttpsUrl(value: string, name: string): string;
