import type { Policy, ProposalOutput } from '../sputnik';

/** e2e-team-2ece-4zbi7v.sputnikv2.testnet proposal 0 (version 2.3.1), read 2026-11-13. */
export const LIVE_TRANSFER_PROPOSAL: ProposalOutput = {
  id: 0,
  proposer: 'bot.commons-spike-mw75h7o0.testnet',
  description: 'pizza for demo night (asked by @alice2ece in Telegram)',
  kind: {
    Transfer: {
      token_id: '',
      receiver_id: 'bob2ece.commons-spike-mw75h7o0.testnet',
      amount: '100000000000000000000000',
      msg: null,
    },
  },
  status: 'Approved',
  vote_counts: { council: [2, 0, 0] },
  votes: {
    'alice2ece.commons-spike-mw75h7o0.testnet': 'Approve',
    'bob2ece.commons-spike-mw75h7o0.testnet': 'Approve',
  },
  submission_time: '1794515258987148509',
};

/** harvestpool-community-garden.sputnikv2.testnet proposal 0 (version 2.3.1), read 2026-11-13. */
export const LIVE_FACTORY_INFO_PROPOSAL: ProposalOutput = {
  id: 0,
  proposer: 'dalamaa.testnet',
  description: 'Disable factory auto-updates before Community Garden contributions',
  kind: { FactoryInfoUpdate: { factory_info: { factory_id: 'sputnikv2.testnet', auto_update: false } } },
  status: 'Approved',
  vote_counts: { community: [2, 0, 0] },
  votes: { 'dalamaa.testnet': 'Approve', 'harvestpool-member-a-2026.testnet': 'Approve' },
  submission_time: '1794553638645897901',
};

/** harvestpool-community-garden.sputnikv2.testnet get_policy (version 2.3.1), read 2026-11-13. */
export const LIVE_POLICY: Policy = {
  roles: [
    { name: 'all', kind: 'Everyone', permissions: [], vote_policy: {} },
    {
      name: 'community',
      kind: { Group: ['harvestpool-member-a-2026.testnet', 'harvestpool-farmer-2026.testnet', 'dalamaa.testnet'] },
      permissions: [
        'factory_info_update:AddProposal',
        'transfer:VoteRemove',
        'factory_info_update:VoteReject',
        'factory_info_update:VoteApprove',
        'factory_info_update:VoteRemove',
        'transfer:AddProposal',
        'transfer:Finalize',
        'transfer:VoteApprove',
        'factory_info_update:Finalize',
        'transfer:VoteReject',
      ],
      vote_policy: {},
    },
  ],
  default_vote_policy: { weight_kind: 'RoleWeight', quorum: '0', threshold: [1, 2] },
  proposal_bond: '100000000000000000000000',
  proposal_period: '604800000000000',
  bounty_bond: '1000000000000000000000000',
  bounty_forgiveness_period: '86400000000000',
};
