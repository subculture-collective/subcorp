// Governance — agent-driven policy change proposals + voting
import { sql, jsonb } from '@/lib/db';
import { getPolicy, setPolicy, clearPolicyCache } from './policy';
import { emitEventAndCheckReactions } from './events';
import { logger } from '@/lib/logger';
import type { ConversationTurnEntry } from '@/lib/types';

const log = logger.child({ module: 'governance' });

// ─── Types ───

export type ProposalStatus = 'proposed' | 'voting' | 'accepted' | 'rejected';

export interface GovernanceVote {
    vote: 'approve' | 'reject';
    reason: string;
}

export interface GovernanceProposal {
    id: string;
    proposer: string;
    policy_key: string;
    current_value: Record<string, unknown> | null;
    proposed_value: Record<string, unknown>;
    rationale: string;
    status: ProposalStatus;
    votes: Record<string, GovernanceVote>;
    required_votes: number;
    debate_session_id: string | null;
    created_at: string;
    resolved_at: string | null;
}

// ─── Protected policies that cannot be proposed ───

const PROTECTED_POLICIES = new Set(['system_enabled', 'veto_authority']);

// ─── Create proposal ───

export async function proposeGovernanceChange(
    agentId: string,
    policyKey: string,
    proposedValue: Record<string, unknown>,
    rationale: string,
): Promise<string> {
    // Validate policy key is not protected
    if (PROTECTED_POLICIES.has(policyKey)) {
        throw new Error(
            `Policy "${policyKey}" is protected and cannot be changed`,
        );
    }

    // Check for duplicate active proposals on same policy
    const [existing] = await sql<[{ id: string }?]>`
        SELECT id FROM ops_governance_proposals
        WHERE policy_key = ${policyKey}
          AND status IN ('proposed', 'voting')
        LIMIT 1
    `;

    if (existing) {
        throw new Error(
            `An active proposal already exists for policy "${policyKey}"`,
        );
    }

    // Get current policy value
    const currentValue = await getPolicy(policyKey);

    // Insert proposal
    const [row] = await sql<[{ id: string }]>`
        INSERT INTO ops_governance_proposals
            (proposer, policy_key, current_value, proposed_value, rationale)
        VALUES (
            ${agentId},
            ${policyKey},
            ${jsonb(currentValue)},
            ${jsonb(proposedValue)},
            ${rationale}
        )
        RETURNING id
    `;

    log.info('Governance proposal created', {
        id: row.id,
        proposer: agentId,
        policyKey,
    });

    // Emit event (triggers reaction matrix → debate roundtable)
    await emitEventAndCheckReactions({
        agent_id: agentId,
        kind: 'governance_proposal_created',
        title: `${agentId} proposes change to ${policyKey}`,
        summary: rationale,
        tags: ['governance', 'proposal', policyKey],
        metadata: {
            proposalId: row.id,
            policyKey,
            proposedValue,
            currentValue,
        },
    });

    return row.id;
}

// ─── Cast vote ───

export async function castGovernanceVote(
    proposalId: string,
    agentId: string,
    vote: 'approve' | 'reject',
    reason: string,
): Promise<void> {
    // Fetch proposal
    const [proposal] = await sql<[GovernanceProposal?]>`
        SELECT * FROM ops_governance_proposals
        WHERE id = ${proposalId}
    `;

    if (!proposal) {
        throw new Error(`Proposal "${proposalId}" not found`);
    }

    if (proposal.status !== 'voting') {
        throw new Error(
            `Proposal is not in voting status (current: ${proposal.status})`,
        );
    }

    // Check if agent already voted
    const votes: Record<string, GovernanceVote> =
        typeof proposal.votes === 'object' && proposal.votes !== null ?
            (proposal.votes as Record<string, GovernanceVote>)
        :   {};

    if (votes[agentId]) {
        log.warn('Agent already voted on this proposal', {
            proposalId,
            agentId,
        });
        return; // Silently ignore duplicate votes
    }

    // Add vote
    votes[agentId] = { vote, reason };

    await sql`
        UPDATE ops_governance_proposals
        SET votes = ${jsonb(votes)}
        WHERE id = ${proposalId}
    `;

    log.info('Governance vote cast', { proposalId, agentId, vote });

    // Check for resolution
    const approvals = Object.values(votes).filter(
        v => v.vote === 'approve',
    ).length;
    const rejections = Object.values(votes).filter(
        v => v.vote === 'reject',
    ).length;

    if (approvals >= proposal.required_votes) {
        // Check for binding veto before accepting
        const { hasActiveVeto } = await import('./veto');
        const vetoCheck = await hasActiveVeto('governance', proposalId);
        if (vetoCheck.vetoed && vetoCheck.severity === 'binding') {
            log.info('Governance proposal blocked by binding veto', {
                proposalId,
                vetoId: vetoCheck.vetoId,
                reason: vetoCheck.reason,
            });
            await sql`
                UPDATE ops_governance_proposals
                SET status = 'rejected', resolved_at = NOW()
                WHERE id = ${proposalId}
            `;
            await emitEventAndCheckReactions({
                agent_id: proposal.proposer,
                kind: 'governance_proposal_vetoed',
                title: `Policy change to "${proposal.policy_key}" blocked by binding veto`,
                summary: vetoCheck.reason ?? 'Binding veto active',
                tags: ['governance', 'vetoed', proposal.policy_key],
                metadata: { proposalId, vetoId: vetoCheck.vetoId },
            });
            return;
        }

        // Accepted — apply policy change
        await sql`
            UPDATE ops_governance_proposals
            SET status = 'accepted', resolved_at = NOW()
            WHERE id = ${proposalId}
        `;

        await setPolicy(
            proposal.policy_key,
            proposal.proposed_value,
            `Applied via governance proposal ${proposalId} — proposed by ${proposal.proposer}`,
        );
        clearPolicyCache();

        await emitEventAndCheckReactions({
            agent_id: proposal.proposer,
            kind: 'governance_proposal_accepted',
            title: `Policy "${proposal.policy_key}" changed via governance`,
            summary: `${approvals} approvals out of ${Object.keys(votes).length} votes`,
            tags: ['governance', 'accepted', proposal.policy_key],
            metadata: {
                proposalId,
                policyKey: proposal.policy_key,
                proposedValue: proposal.proposed_value,
                approvals,
                rejections,
                voters: Object.keys(votes),
            },
        });

        log.info('Governance proposal accepted', {
            proposalId,
            approvals,
            rejections,
        });
    } else if (rejections >= 3) {
        // Rejected — 3+ rejections blocks
        await sql`
            UPDATE ops_governance_proposals
            SET status = 'rejected', resolved_at = NOW()
            WHERE id = ${proposalId}
        `;

        await emitEventAndCheckReactions({
            agent_id: proposal.proposer,
            kind: 'governance_proposal_rejected',
            title: `Policy change to "${proposal.policy_key}" rejected`,
            summary: `${rejections} rejections out of ${Object.keys(votes).length} votes`,
            tags: ['governance', 'rejected', proposal.policy_key],
            metadata: {
                proposalId,
                policyKey: proposal.policy_key,
                approvals,
                rejections,
                voters: Object.keys(votes),
            },
        });

        log.info('Governance proposal rejected', {
            proposalId,
            approvals,
            rejections,
        });
    }
}

// ─── Query proposals ───

export async function getGovernanceProposals(filters?: {
    status?: ProposalStatus;
    proposer?: string;
    limit?: number;
}): Promise<GovernanceProposal[]> {
    const limit = filters?.limit ?? 50;
    const status = filters?.status;
    const proposer = filters?.proposer;

    if (status && proposer) {
        return sql<GovernanceProposal[]>`
            SELECT * FROM ops_governance_proposals
            WHERE status = ${status} AND proposer = ${proposer}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    } else if (status) {
        return sql<GovernanceProposal[]>`
            SELECT * FROM ops_governance_proposals
            WHERE status = ${status}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    } else if (proposer) {
        return sql<GovernanceProposal[]>`
            SELECT * FROM ops_governance_proposals
            WHERE proposer = ${proposer}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    }

    return sql<GovernanceProposal[]>`
        SELECT * FROM ops_governance_proposals
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
}

// ─── Update proposal status (e.g. proposed → voting) ───

export async function updateProposalStatus(
    proposalId: string,
    status: ProposalStatus,
    debateSessionId?: string,
): Promise<void> {
    if (debateSessionId) {
        await sql`
            UPDATE ops_governance_proposals
            SET status = ${status}, debate_session_id = ${debateSessionId}
            WHERE id = ${proposalId}
        `;
    } else {
        await sql`
            UPDATE ops_governance_proposals
            SET status = ${status}
            WHERE id = ${proposalId}
        `;
    }
}

// ─── Collect votes by parsing each agent's last debate turn ───

export async function collectGovernanceDebateVotes(
    proposalId: string,
    participants: string[],
    debateHistory: ConversationTurnEntry[],
): Promise<{
    result: 'accepted' | 'rejected' | 'pending';
    approvals: number;
    rejections: number;
}> {
    const [proposal] = await sql<[GovernanceProposal?]>`
        SELECT * FROM ops_governance_proposals WHERE id = ${proposalId}
    `;
    if (!proposal)
        throw new Error(`Governance proposal "${proposalId}" not found`);
    if (proposal.status !== 'voting') {
        throw new Error(
            `Proposal not in voting status (current: ${proposal.status})`,
        );
    }

    for (const agentId of participants) {
        // Proposer implicitly approves
        if (agentId === proposal.proposer) {
            await castGovernanceVote(
                proposalId,
                agentId,
                'approve',
                'I proposed this change.',
            );
            continue;
        }

        // Find this agent's last turn in the debate
        const lastTurn = [...debateHistory]
            .reverse()
            .find(t => t.speaker === agentId);

        if (!lastTurn) {
            log.warn('No debate turn found for agent, skipping vote', {
                agentId,
                proposalId,
            });
            continue;
        }

        const text = lastTurn.dialogue;
        const vote = extractVoteFromText(text);

        if (vote) {
            const reason = text.slice(-200).trim();
            await castGovernanceVote(proposalId, agentId, vote, reason);
        } else {
            log.warn(
                'Could not determine vote from debate turn, skipping agent',
                {
                    agentId,
                    proposalId,
                    textPreview: text.slice(0, 200),
                },
            );
        }
    }

    // Re-read votes to determine outcome
    const [updated] = await sql<[GovernanceProposal]>`
        SELECT * FROM ops_governance_proposals WHERE id = ${proposalId}
    `;
    const votes: Record<string, GovernanceVote> =
        typeof updated.votes === 'object' && updated.votes !== null ?
            (updated.votes as Record<string, GovernanceVote>)
        :   {};

    const approvals = Object.values(votes).filter(
        v => v.vote === 'approve',
    ).length;
    const rejections = Object.values(votes).filter(
        v => v.vote === 'reject',
    ).length;

    // castGovernanceVote already handles resolution (accept/reject) internally
    const [final] = await sql<[{ status: string }]>`
        SELECT status FROM ops_governance_proposals WHERE id = ${proposalId}
    `;

    const result =
        final.status === 'accepted' ? ('accepted' as const)
        : final.status === 'rejected' ? ('rejected' as const)
        : ('pending' as const);

    return { result, approvals, rejections };
}

/** Extract approve/reject from text using keyword matching. */
function extractVoteFromText(text: string): 'approve' | 'reject' | null {
    const upper = text.toUpperCase();
    const hasApprove =
        upper.includes('APPROVE') &&
        !upper.includes('NOT APPROVE') &&
        !upper.includes("DON'T APPROVE");
    const hasReject = upper.includes('REJECT');

    if (hasApprove && hasReject) {
        const lastApprove = upper.lastIndexOf('APPROVE');
        const lastReject = upper.lastIndexOf('REJECT');
        return lastApprove > lastReject ? 'approve' : 'reject';
    }

    if (hasApprove) return 'approve';
    if (hasReject) return 'reject';
    return null;
}
