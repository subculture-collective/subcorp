// Governance — agent-driven policy change proposals + voting
import { sql, jsonb } from '@/lib/db';
import { getPolicy, setPolicy, clearPolicyCache } from './policy';
import { emitEventAndCheckReactions } from './events';
import { logger } from '@/lib/logger';
import { llmGenerate } from '@/lib/llm/client';
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

type GovernanceVoteChoice = 'approve' | 'reject';

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
            try {
                await castGovernanceVote(
                    proposalId,
                    agentId,
                    'approve',
                    'I proposed this change.',
                );
            } catch (err) {
                const message = (err as Error).message;
                if (message.includes('not in voting status')) break;
                throw err;
            }
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
        const vote =
            extractVoteFromText(text) ??
            (await inferVoteFromDebateTurn(agentId, proposal, text, debateHistory));

        if (vote) {
            const reason = text.slice(-200).trim();
            try {
                await castGovernanceVote(proposalId, agentId, vote, reason);
            } catch (err) {
                const message = (err as Error).message;
                if (message.includes('not in voting status')) break;
                throw err;
            }
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

export async function backfillGovernanceVotes(
    limit = 10,
): Promise<{
    processed: number;
    resolved: number;
    requeued: number;
    votesAdded: number;
    failed: number;
}> {
    const rows = await sql<
        Array<{
            id: string;
            debate_session_id: string;
            participants: string[];
        }>
    >`
        SELECT gp.id, gp.debate_session_id, rs.participants
        FROM ops_governance_proposals gp
        JOIN ops_roundtable_sessions rs ON rs.id = gp.debate_session_id
        WHERE gp.status = 'voting'
          AND gp.debate_session_id IS NOT NULL
          AND rs.status = 'completed'
        ORDER BY gp.created_at ASC
        LIMIT ${Math.max(1, Math.min(limit, 50))}
    `;

    let processed = 0;
    let resolved = 0;
    let requeued = 0;
    let votesAdded = 0;
    let failed = 0;

    const staleCutoff = new Date(Date.now() - 20 * 60_000).toISOString();

    const staleRunning = await sql<Array<{ id: string }>>`
        SELECT gp.id
        FROM ops_governance_proposals gp
        JOIN ops_roundtable_sessions rs ON rs.id = gp.debate_session_id
        WHERE gp.status = 'voting'
          AND gp.debate_session_id IS NOT NULL
          AND rs.status = 'running'
          AND rs.started_at < ${staleCutoff}
    `;

    for (const row of staleRunning) {
        await sql`
            UPDATE ops_governance_proposals
            SET status = 'proposed',
                debate_session_id = NULL,
                votes = '{}'::jsonb
            WHERE id = ${row.id}
        `;

        await emitEventAndCheckReactions({
            agent_id: 'system',
            kind: 'governance_debate_requeued',
            title: 'Governance debate requeued after stale running session',
            summary: `Proposal ${row.id} returned to proposed for a fresh debate`,
            tags: ['governance', 'debate', 'requeued'],
            metadata: { proposalId: row.id },
        });

        requeued++;
    }

    for (const row of rows) {
        try {
            const [before] = await sql<
                [{ votes: Record<string, GovernanceVote> | null; status: ProposalStatus }]
            >`
                SELECT votes, status FROM ops_governance_proposals WHERE id = ${row.id}
            `;

            const beforeVotes =
                before?.votes && typeof before.votes === 'object' ?
                    Object.keys(before.votes).length
                :   0;

            const debateHistory = await sql<
                Array<{ speaker: string; dialogue: string; turn_number: number }>
            >`
                SELECT speaker, dialogue, turn_number
                FROM ops_roundtable_turns
                WHERE session_id = ${row.debate_session_id}
                ORDER BY turn_number ASC
            `;

            if (debateHistory.length === 0) {
                continue;
            }

            await collectGovernanceDebateVotes(
                row.id,
                row.participants,
                debateHistory.map(turn => ({
                    speaker: turn.speaker,
                    dialogue: turn.dialogue,
                    turn: turn.turn_number,
                })),
            );

            const [after] = await sql<
                [{ votes: Record<string, GovernanceVote> | null; status: ProposalStatus }]
            >`
                SELECT votes, status FROM ops_governance_proposals WHERE id = ${row.id}
            `;

            const afterVotes =
                after?.votes && typeof after.votes === 'object' ?
                    Object.keys(after.votes).length
                :   0;

            votesAdded += Math.max(0, afterVotes - beforeVotes);
            if (before?.status === 'voting' && after?.status !== 'voting') {
                resolved++;
            } else if (after?.status === 'voting') {
                await sql`
                    UPDATE ops_governance_proposals
                    SET status = 'proposed',
                        debate_session_id = NULL,
                        votes = '{}'::jsonb
                    WHERE id = ${row.id}
                      AND status = 'voting'
                `;

                await emitEventAndCheckReactions({
                    agent_id: 'system',
                    kind: 'governance_debate_requeued',
                    title: 'Governance debate requeued after incomplete vote collection',
                    summary: `Proposal ${row.id} still lacked a decision after debate vote extraction`,
                    tags: ['governance', 'debate', 'requeued'],
                    metadata: {
                        proposalId: row.id,
                        previousVotes: afterVotes,
                    },
                });

                requeued++;
            }
            processed++;
        } catch (err) {
            failed++;
            log.error('Governance vote backfill failed', {
                proposalId: row.id,
                sessionId: row.debate_session_id,
                error: (err as Error).message,
            });
        }
    }

    return { processed, resolved, requeued, votesAdded, failed };
}

/** Extract approve/reject from text using keyword matching. */
function extractVoteFromText(text: string): 'approve' | 'reject' | null {
    const upper = text.toUpperCase();
    const hasApprove =
        upper.includes('APPROVE') &&
        !upper.includes('NOT APPROVE') &&
        !upper.includes("DON'T APPROVE");
    const hasReject = upper.includes('REJECT');
    const hasVeto = upper.includes('VETO');

    if (hasVeto && !hasApprove) return 'reject';

    const rejectSignals = [
        'I OPPOSE',
        'DO NOT SUPPORT',
        'NO-GO',
        'BLOCK THIS',
        'VETO STANDS',
    ];
    const approveSignals = [
        'I SUPPORT',
        'I BACK',
        'I ENDORSE',
        'GO AHEAD',
        'SHIP IT',
    ];

    if (hasApprove && hasReject) {
        const lastApprove = upper.lastIndexOf('APPROVE');
        const lastReject = upper.lastIndexOf('REJECT');
        return lastApprove > lastReject ? 'approve' : 'reject';
    }

    if (hasApprove) return 'approve';
    if (hasReject) return 'reject';

    if (rejectSignals.some(signal => upper.includes(signal))) return 'reject';
    if (approveSignals.some(signal => upper.includes(signal))) return 'approve';

    return null;
}

async function inferVoteFromDebateTurn(
    agentId: string,
    proposal: GovernanceProposal,
    finalTurn: string,
    debateHistory: ConversationTurnEntry[],
): Promise<GovernanceVoteChoice | null> {
    const debateSnippet = debateHistory
        .slice(-8)
        .map(t => `${t.speaker}: ${t.dialogue}`)
        .join('\n');

    try {
        const result = await llmGenerate({
            messages: [
                {
                    role: 'system',
                    content:
                        'Classify the voter stance as approve, reject, or abstain. ' +
                        'Return strict JSON only: {"vote":"approve"|"reject"|"abstain"}.',
                },
                {
                    role: 'user',
                    content:
                        `Governance proposal: ${proposal.policy_key}\n` +
                        `Rationale: ${proposal.rationale}\n\n` +
                        `Agent: ${agentId}\n` +
                        `Agent final turn:\n${finalTurn}\n\n` +
                        `Recent debate context:\n${debateSnippet}\n\n` +
                        `Classify this agent's vote now.`,
                },
            ],
            temperature: 0,
            maxTokens: 80,
            trackingContext: {
                agentId,
                context: 'governance_vote_inference',
            },
        });

        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        const parsed = JSON.parse(jsonMatch[0]) as {
            vote?: 'approve' | 'reject' | 'abstain';
        };

        if (parsed.vote === 'approve' || parsed.vote === 'reject') {
            return parsed.vote;
        }
        return null;
    } catch (err) {
        log.warn('LLM governance vote inference failed', {
            error: (err as Error).message,
            proposalId: proposal.id,
            agentId,
        });
        return null;
    }
}
