/**
 * What the wallet panel says around a desk call, in plain words. Pure, so it is unit-tested.
 *
 * Why it exists: Meteor signs a call that attaches no NEAR (ask, cancel, co-sign) in the page with the desk key it
 * added at sign-in, but a call that attaches NEAR (repay) needs the member's approval in Meteor itself: in its browser
 * extension when installed (whose window may not come to the front), otherwise in a pop-up window opened only after a
 * few network reads. If the browser blocks that pop-up Meteor throws; if it was closed before it connected, or the
 * extension request is never looked at, Meteor waits with no time limit. In the wallet run of 2026-11-14 the panel then
 * sat on "Opening your wallet for repay…" and a repayment the member believed sent never reached the chain.
 */

/** After this long without an answer from the wallet, the panel explains what may have happened. */
export const SLOW_WALLET_MS = 8_000;

const ACTION: Record<string, string> = { ask: 'Ask', repay: 'Repay', cosign: 'Co-sign', cancel_request: 'Cancel my request' };

function button(method: string): string {
  return ACTION[method] ?? method;
}

export function openingStatus(method: string): string {
  return `Opening your wallet for ${method}…`;
}

/**
 * Shown when the wallet has not answered after SLOW_WALLET_MS. Claims nothing it did not read. Meteor asks for
 * approval of a call that attaches NEAR in its browser extension when installed (which may only badge its toolbar
 * icon), otherwise in a pop-up window the browser can block.
 */
export function slowStatus(method: string): string {
  return (
    `Still waiting for your wallet to approve ${method}. Nothing is sent until you approve it there. ` +
    `With the Meteor extension, click the Meteor icon in the browser toolbar if no window came up. ` +
    `Without it, Meteor opens a pop-up window: if none appeared, the browser may have blocked it (look for the blocked pop-up icon in the address bar), ` +
    `so allow pop-ups for this site and press ${button(method)} again. If you closed the wallet window, nothing was sent.`
  );
}

function endTags(err: unknown): string[] {
  if (typeof err !== 'object' || err === null) return [];
  const reason = (err as { _reason?: { endTags?: unknown } })._reason;
  return Array.isArray(reason?.endTags) ? reason.endTags.filter((t): t is string => typeof t === 'string') : [];
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** A wallet error in plain words, saying "nothing was sent" only where the wallet's own error proves it. */
export function errorStatus(method: string, err: unknown): string {
  const tags = endTags(err);
  const text = message(err);
  if (tags.includes('POPUP_WINDOW_OPEN_FAILED') || tags.includes('POPUP_WINDOW_REFUSED') || /couldn't open popup|popup window failed/i.test(text)) {
    return `Meteor Wallet could not open its window because the browser blocked the pop-up, so nothing was sent. Allow pop-ups for this site, then press ${button(method)} again.`;
  }
  if (tags.includes('WINDOW_CLOSED') || tags.includes('INCOMPLETE_ACTION') || /closed the window/i.test(text)) {
    return `The wallet window was closed before ${method} was approved, so nothing was sent.`;
  }
  if (tags.includes('USER_CANCELLED') || /user (rejected|cancelled|canceled)/i.test(text)) {
    return `You cancelled ${method} in the wallet, so nothing was sent.`;
  }
  if (tags.includes('NEW_ACTION_STARTED')) {
    return `A newer wallet action replaced ${method}, so ${method} was not sent.`;
  }
  return `The wallet reported an error for ${method}: ${text}. Check the board before trying again.`;
}

/** The transaction hash from a wallet's execution outcome, when it returns one. */
export function txHash(outcome: unknown): string | null {
  if (typeof outcome !== 'object' || outcome === null) return null;
  const o = outcome as { transaction?: { hash?: unknown }; transaction_outcome?: { id?: unknown } };
  const hash = o.transaction?.hash ?? o.transaction_outcome?.id;
  return typeof hash === 'string' && hash.length > 0 ? hash : null;
}

export function sentStatus(method: string, outcome: unknown): string {
  const hash = txHash(outcome);
  return hash === null
    ? `Your wallet returned from ${method}. Fiador has not read the result; the board shows it once the desk records it.`
    : `Your wallet sent ${method} in transaction ${hash}. The board shows the result once the desk records it.`;
}

/** Explorer link for a transaction hash on the deployment's explorer. */
export function txUrl(explorer: string, hash: string): string {
  return `${explorer.replace(/\/$/, '')}/txns/${hash}`;
}
