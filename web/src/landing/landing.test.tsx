import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Landing } from './Landing';

describe('landing page', () => {
  const html = renderToStaticMarkup(<Landing deployment={null} />);

  it('has the frontend-contract sections in order', () => {
    const order = ['id="hero"', 'id="problem"', 'id="how"', 'id="proof"', 'id="try"', '<footer>'];
    const positions = order.map((needle) => html.indexOf(needle));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('links into the board and to the repo', () => {
    expect(html).toContain('href="./app/"');
    expect(html).toContain('href="https://github.com/Dotman-Bei/fiador"');
  });

  it('has no demo-video section (the video lives in the README)', () => {
    expect(html).not.toContain('id="demo"');
    expect(html).not.toContain('demo video');
  });

  it('names the three lanes and the verify command', () => {
    for (const text of ['Standing lane', 'Co-signed lane', 'Council lane', 'npm run verify']) expect(html).toContain(text);
  });

  it('shows the live DAO when the build was seeded', () => {
    const seeded = renderToStaticMarkup(
      <Landing
        deployment={{
          network: 'testnet',
          rpc: 'r',
          factory: 'sputnikv2.testnet',
          dao: 'fiador.sputnikv2.testnet',
          desk: 'desk.root.testnet',
          smoke: 's',
          council: [],
          root: 'root.testnet',
          seeded_at: 't',
          explorer: 'https://testnet.nearblocks.io',
        }}
      />,
    );
    expect(seeded).toContain('<code>fiador.sputnikv2.testnet</code>');
  });
});
