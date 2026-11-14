import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WalletChooser } from './MemberActions';
import { lazyMeteorWallet } from './wallet';

const meteorInit = vi.fn(async () => ({ marker: 'meteor behaviour' }));
const setupMeteorWallet = vi.fn(() => async () => ({ id: 'meteor-wallet', init: meteorInit }));
vi.mock('@near-wallet-selector/meteor-wallet', () => ({ setupMeteorWallet }));

describe('Meteor Wallet connector', () => {
  it('registers by name without loading the Meteor SDK', async () => {
    const module = await lazyMeteorWallet({ options: {} as never });
    expect(module).toMatchObject({ id: 'meteor-wallet', type: 'injected', metadata: { name: 'Meteor Wallet', available: true } });
    expect(setupMeteorWallet).not.toHaveBeenCalled();
  });

  it('loads the SDK on init and hands over to the real Meteor module', async () => {
    const module = await lazyMeteorWallet({ options: {} as never });
    const options = { options: { network: { networkId: 'testnet' } } } as never;
    const behaviour = await module?.init(options);
    expect(setupMeteorWallet).toHaveBeenCalledTimes(1);
    expect(meteorInit).toHaveBeenCalledWith(options);
    expect(behaviour).toEqual({ marker: 'meteor behaviour' });
  });
});

describe('wallet chooser', () => {
  it('offers Meteor first and says MyNearWallet is for existing accounts only', () => {
    const html = renderToStaticMarkup(<WalletChooser onChoose={() => undefined} />);
    expect(html.indexOf('Connect with Meteor Wallet')).toBeGreaterThan(-1);
    expect(html.indexOf('Connect with MyNearWallet (existing accounts only)')).toBeGreaterThan(html.indexOf('Connect with Meteor Wallet'));
    expect(html).not.toContain('disabled');
  });

  it('disables both buttons while a wallet is opening', () => {
    const html = renderToStaticMarkup(<WalletChooser busy onChoose={() => undefined} />);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it('passes the chosen wallet id', () => {
    const chosen: string[] = [];
    const tree = WalletChooser({ onChoose: (id) => chosen.push(id) });
    const buttons = (tree.props as { children: { props: { onClick: () => void } }[] }).children;
    for (const b of buttons) b.props.onClick();
    expect(chosen).toEqual(['meteor-wallet', 'my-near-wallet']);
  });
});
