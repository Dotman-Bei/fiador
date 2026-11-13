export interface ChainGas {
  addProposal: bigint;
  onFiled: bigint;
  actProposal: bigint;
  onVoted: bigint;
}

interface ReceiptNode {
  executor: string;
  gasBurnt: bigint;
  children: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseReceipts(raw: unknown): { rootId: string; nodes: Map<string, ReceiptNode> } {
  if (!isRecord(raw)) throw new Error('gas: outcome is not an object');
  const tx = raw['transaction_outcome'];
  const txOutcome = isRecord(tx) ? tx['outcome'] : undefined;
  const rootIds = isRecord(txOutcome) ? txOutcome['receipt_ids'] : undefined;
  const rootId = Array.isArray(rootIds) ? rootIds[0] : undefined;
  if (typeof rootId !== 'string') throw new Error('gas: no root receipt');
  const nodes = new Map<string, ReceiptNode>();
  const receipts = raw['receipts_outcome'];
  if (Array.isArray(receipts)) {
    for (const r of receipts) {
      if (!isRecord(r)) continue;
      const id = r['id'];
      const outcome = r['outcome'];
      if (typeof id !== 'string' || !isRecord(outcome)) continue;
      const executor = outcome['executor_id'];
      const gas = outcome['gas_burnt'];
      const children = outcome['receipt_ids'];
      nodes.set(id, {
        executor: typeof executor === 'string' ? executor : '',
        gasBurnt: typeof gas === 'number' ? BigInt(Math.round(gas)) : 0n,
        children: Array.isArray(children) ? children.filter((c): c is string => typeof c === 'string') : [],
      });
    }
  }
  return { rootId, nodes };
}

function subtreeGas(nodes: Map<string, ReceiptNode>, id: string): bigint {
  const n = nodes.get(id);
  if (n === undefined) return 0n;
  return n.children.reduce((sum, child) => sum + subtreeGas(nodes, child), n.gasBurnt);
}

function childBy(nodes: Map<string, ReceiptNode>, parentId: string, executor: string): string | undefined {
  const parent = nodes.get(parentId);
  return parent?.children.find((c) => nodes.get(c)?.executor === executor);
}

/**
 * Gas each step of `file_and_approve` really used, as the burnt gas of that step's receipt subtree:
 * root → [add_proposal on the DAO, on_filed on the contract]; on_filed → [act_proposal on the DAO, on_voted].
 */
export function measureChain(raw: unknown, daoId: string, contractId: string): ChainGas {
  const { rootId, nodes } = parseReceipts(raw);
  const add = childBy(nodes, rootId, daoId);
  if (add === undefined) throw new Error('gas: no add_proposal receipt');
  const onFiled = childBy(nodes, rootId, contractId);
  if (onFiled === undefined) throw new Error('gas: no on_filed receipt');
  const act = childBy(nodes, onFiled, daoId);
  if (act === undefined) throw new Error('gas: no act_proposal receipt');
  const onVoted = childBy(nodes, onFiled, contractId);
  if (onVoted === undefined) throw new Error('gas: no on_voted receipt');
  return {
    addProposal: subtreeGas(nodes, add),
    onFiled: subtreeGas(nodes, onFiled),
    actProposal: subtreeGas(nodes, act),
    onVoted: subtreeGas(nodes, onVoted),
  };
}

export function recommendedGas(measured: bigint): bigint {
  return (measured * 13n + 9n) / 10n;
}
