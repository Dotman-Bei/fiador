/**
 * Testnet wallet connection via NEAR Wallet Selector: Meteor Wallet (which creates new testnet accounts) and
 * MyNearWallet (existing accounts only; it no longer creates accounts). Optional: the board works without it.
 */
import { actionCreators } from '@near-js/transactions';
import { setupWalletSelector } from '@near-wallet-selector/core';
import type { InjectedWallet, WalletModuleFactory, WalletSelector } from '@near-wallet-selector/core';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import type { CallSpec } from './actions';

export type WalletId = 'meteor-wallet' | 'my-near-wallet';

/**
 * Meteor Wallet, registered by name only. Wallet Selector calls `init` only when Meteor is chosen (or restored as
 * the signed-in wallet after a reload), so its SDK is fetched on that click and never by a read-only visitor.
 */
export const lazyMeteorWallet: WalletModuleFactory<InjectedWallet> = async () => ({
  id: 'meteor-wallet',
  type: 'injected',
  metadata: {
    name: 'Meteor Wallet',
    description: 'Meteor Wallet, loaded when chosen.',
    iconUrl: '',
    deprecated: false,
    available: true,
    downloadUrl: 'https://wallet.meteorwallet.app',
    useUrlAccountImport: true,
  },
  init: async (options) => {
    const { setupMeteorWallet } = await import('@near-wallet-selector/meteor-wallet');
    const module = await setupMeteorWallet()({ options: options.options });
    if (module === null) throw new Error('Meteor Wallet is not available in this browser');
    return module.init(options);
  },
});

let selector: Promise<WalletSelector> | null = null;

function getSelector(): Promise<WalletSelector> {
  selector ??= setupWalletSelector({ network: 'testnet', modules: [lazyMeteorWallet, setupMyNearWallet()] });
  return selector;
}

export async function currentAccount(): Promise<string | null> {
  const s = await getSelector();
  return s.store.getState().accounts[0]?.accountId ?? null;
}

/**
 * Signs in with the chosen wallet. Meteor answers in a popup or its extension and resolves here with the account;
 * MyNearWallet leaves the page and comes back, and the account is read on that load.
 */
export async function signIn(deskId: string, walletId: WalletId): Promise<string | null> {
  const s = await getSelector();
  const wallet = await s.wallet<InjectedWallet>(walletId);
  const accounts = await wallet.signIn({ contractId: deskId, methodNames: [] });
  return accounts[0]?.accountId ?? s.store.getState().accounts[0]?.accountId ?? null;
}

export async function signOut(): Promise<void> {
  const s = await getSelector();
  if (!s.isSignedIn()) return;
  const wallet = await s.wallet();
  await wallet.signOut();
}

/** Sends one desk call from the signed-in account; the wallet asks the member to confirm. */
export async function send(deskId: string, spec: CallSpec): Promise<void> {
  const s = await getSelector();
  const wallet = await s.wallet();
  await wallet.signAndSendTransaction({
    receiverId: deskId,
    actions: [actionCreators.functionCall(spec.methodName, spec.args, spec.gas, spec.deposit)],
  });
}
