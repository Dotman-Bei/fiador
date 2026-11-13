/** The public ids `seed` writes to deployments/testnet.json. No secrets: account ids are public identifiers. */
export interface Deployment {
  network: 'testnet';
  rpc: string;
  factory: string;
  dao: string;
  desk: string;
  smoke: string;
  council: string[];
  root: string;
  seeded_at: string;
  explorer: string;
}

export const DEPLOYMENT_PATH = 'deployments/testnet.json';
export const EXPLORER = 'https://testnet.nearblocks.io';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isDeployment(value: unknown): value is Deployment {
  if (!isRecord(value)) return false;
  const council = value['council'];
  return (
    value['network'] === 'testnet' &&
    ['rpc', 'factory', 'dao', 'desk', 'smoke', 'root', 'seeded_at', 'explorer'].every((k) => typeof value[k] === 'string') &&
    Array.isArray(council) &&
    council.every((c) => typeof c === 'string')
  );
}

export function accountUrl(deployment: Pick<Deployment, 'explorer'>, accountId: string): string {
  return `${deployment.explorer}/address/${accountId}`;
}
