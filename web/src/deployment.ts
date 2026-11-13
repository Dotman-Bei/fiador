/** The seeded testnet ids, compiled into the build from deployments/testnet.json when it exists. */
import { isDeployment } from '../../src/lib/deployments';
import type { Deployment } from '../../src/lib/deployments';

const found: Record<string, unknown> = import.meta.glob('../../deployments/testnet.json', { eager: true, import: 'default' });

export function loadDeployment(): Deployment | null {
  const value = Object.values(found)[0];
  return isDeployment(value) ? value : null;
}

export const REPO_URL = 'https://github.com/Dotman-Bei/fiador';
