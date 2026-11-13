/** Testnet wallet connection (MyNearWallet via NEAR Wallet Selector). Optional: the board works without it. */
import { actionCreators } from '@near-js/transactions';
import { setupWalletSelector } from '@near-wallet-selector/core';
import type { InjectedWallet, WalletSelector } from '@near-wallet-selector/core';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import type { CallSpec } from './actions';

let selector: Promise<WalletSelector> | null = null;

function getSelector(): Promise<WalletSelector> {
  selector ??= setupWalletSelector({ network: 'testnet', modules: [setupMyNearWallet()] });
  return selector;
}

export async function currentAccount(): Promise<string | null> {
  const s = await getSelector();
  return s.store.getState().accounts[0]?.accountId ?? null;
}

export async function signIn(deskId: string): Promise<void> {
  const s = await getSelector();
  const wallet = await s.wallet<InjectedWallet>('my-near-wallet');
  await wallet.signIn({ contractId: deskId, methodNames: [] });
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
