// Veto authority — binding enforcement power for agents
// Subrosa: binding vetoes (immediate halt)
// Other agents: soft vetoes (trigger review hold)
// Primus/human: can override any veto
import { sql, jsonb } from '@/lib/db';
import { getPolicy } from './policy';
import { emitEvent } from './events';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'veto' });

// ─── Types ───

export type VetoTargetType = 'proposal' | 'mission' | 'governance' | 'step';
export type VetoSeverity = 'binding' | 'soft';
export type VetoStatus = 'active' | 'overridden' | 'withdrawn' | 'expired';

export interface Veto {
    id: string;
    agent_id: string;
    target_type: VetoTargetType;
    target_id: string;
    reason: string;
    severity: VetoSeverity;
    status: VetoStatus;
    override_by: string | null;
    override_reason: string | null;
    expires_at: string | null;
    created_at: string;
    resolved_at: string | null;
}

export interface VetoCheck {
    vetoed: boolean;
    vetoId?: string;
    reason?: string;
    severity?: VetoSeverity;
}

interface VetoPolicy {
    enabled: boolean;
    binding_agents: string[];
    soft_veto_agents: string[];
    override_agents: string[];
    default_expiry_hours: number;
    protected_step_kinds: string[];
}

async function loadVetoPolicy(): Promise<VetoPolicy> {
    const raw = await getPolicy('veto_authority');
    return {
        enabled: (raw.enabled as boolean) ?? false,
        binding_agents: (raw.binding_agents as string[]) ?? ['subrosa'],
        soft_veto_agents: (raw.soft_veto_agents as string[]) ?? [],
        override_agents: (raw.override_agents as string[]) ?? ['primus'],
        default_expiry_hours: (raw.default_expiry_hours as number) ?? 72,
        protected_step_kinds: (raw.protected_step_kinds as string[]) ?? ['patch_code'],
    };
}

// ─── Cast veto ───

export async function castVeto(
    agentId: string,
    targetType: VetoTargetType,
    targetId: string,
    reason: string,
): Promise<{ vetoId: string; severity: VetoSeverity }> {
    const policy = await loadVetoPolicy();

    if (!policy.enabled) {
        throw new Error('Veto authority is not enabled');
    }

    // Determine severity based on agent
    const severity: VetoSeverity =
        policy.binding_agents.includes(agentId) ? 'binding' : 'soft';

    // Calculate expiry
    const expiresAt = new Date(
        Date.now() + policy.default_expiry_hours * 60 * 60 * 1000,
    );

    // Check for duplicate active veto by same agent on same target
    const [existing] = await sql<[{ id: string }?]>`
        SELECT id FROM ops_vetoes
        WHERE agent_id = ${agentId}
          AND target_type = ${targetType}
          AND target_id = ${targetId}
          AND status = 'active'
        LIMIT 1
    `;

    if (existing) {
        throw new Error(
            `${agentId} already has an active veto on this ${targetType}`,
        );
    }

    const [row] = await sql<[{ id: string }]>`
        INSERT INTO ops_vetoes (agent_id, target_type, target_id, reason, severity, expires_at)
        VALUES (${agentId}, ${targetType}, ${targetId}, ${reason}, ${severity}, ${expiresAt.toISOString()})
        RETURNING id
    `;

    const vetoId = row.id;

    log.info('Veto cast', { vetoId, agentId, targetType, targetId, severity });

    // For binding vetoes, halt the target immediately
    if (severity === 'binding') {
        await haltTarget(targetType, targetId, reason);
    }

    await emitEvent({
        agent_id: agentId,
        kind: 'veto_cast',
        title: `${agentId} ${severity === 'binding' ? 'VETOED' : 'soft-vetoed'} ${targetType} ${targetId.slice(0, 8)}`,
        summary: reason,
        tags: ['veto', severity, targetType],
        metadata: { vetoId, targetType, targetId, severity },
    });

    return { vetoId, severity };
}

// ─── Check for active vetoes ───

export async function hasActiveVeto(
    targetType: VetoTargetType,
    targetId: string,
): Promise<VetoCheck> {
    // Auto-expire stale vetoes in the same query
    await sql`
        UPDATE ops_vetoes
        SET status = 'expired', resolved_at = NOW()
        WHERE target_type = ${targetType}
          AND target_id = ${targetId}
          AND status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
    `;

    const [veto] = await sql<[{ id: string; reason: string; severity: VetoSeverity }?]>`
        SELECT id, reason, severity FROM ops_vetoes
        WHERE target_type = ${targetType}
          AND target_id = ${targetId}
          AND status = 'active'
        ORDER BY
            CASE severity WHEN 'binding' THEN 0 ELSE 1 END,
            created_at DESC
        LIMIT 1
    `;

    if (!veto) {
        return { vetoed: false };
    }

    return {
        vetoed: true,
        vetoId: veto.id,
        reason: veto.reason,
        severity: veto.severity,
    };
}

// ─── Override veto ───

export async function overrideVeto(
    vetoId: string,
    overrideBy: string,
    reason: string,
): Promise<void> {
    const policy = await loadVetoPolicy();

    // Only override_agents (primus) or 'human' can override
    if (overrideBy !== 'human' && !policy.override_agents.includes(overrideBy)) {
        throw new Error(`${overrideBy} is not authorized to override vetoes`);
    }

    const [veto] = await sql<[Veto?]>`
        SELECT * FROM ops_vetoes WHERE id = ${vetoId}
    `;

    if (!veto) throw new Error(`Veto ${vetoId} not found`);
    if (veto.status !== 'active') throw new Error(`Veto is not active (status: ${veto.status})`);

    await sql`
        UPDATE ops_vetoes
        SET status = 'overridden',
            override_by = ${overrideBy},
            override_reason = ${reason},
            resolved_at = NOW()
        WHERE id = ${vetoId}
    `;

    log.info('Veto overridden', { vetoId, overrideBy, reason });

    await emitEvent({
        agent_id: overrideBy,
        kind: 'veto_overridden',
        title: `${overrideBy} overrode ${veto.agent_id}'s veto on ${veto.target_type}`,
        summary: reason,
        tags: ['veto', 'overridden', veto.target_type],
        metadata: { vetoId, overrideBy, originalAgent: veto.agent_id, targetType: veto.target_type, targetId: veto.target_id },
    });
}

// ─── Withdraw veto ───

export async function withdrawVeto(
    vetoId: string,
    agentId: string,
): Promise<void> {
    const [veto] = await sql<[Veto?]>`
        SELECT * FROM ops_vetoes WHERE id = ${vetoId}
    `;

    if (!veto) throw new Error(`Veto ${vetoId} not found`);
    if (veto.status !== 'active') throw new Error(`Veto is not active (status: ${veto.status})`);
    if (veto.agent_id !== agentId) throw new Error(`Only the casting agent can withdraw a veto`);

    await sql`
        UPDATE ops_vetoes
        SET status = 'withdrawn', resolved_at = NOW()
        WHERE id = ${vetoId}
    `;

    log.info('Veto withdrawn', { vetoId, agentId });

    await emitEvent({
        agent_id: agentId,
        kind: 'veto_withdrawn',
        title: `${agentId} withdrew veto on ${veto.target_type}`,
        summary: `Withdrew veto: ${veto.reason}`,
        tags: ['veto', 'withdrawn', veto.target_type],
        metadata: { vetoId, targetType: veto.target_type, targetId: veto.target_id },
    });
}

// ─── Query active vetoes ───

export async function getActiveVetoes(filters?: {
    agentId?: string;
    targetType?: VetoTargetType;
    limit?: number;
}): Promise<Veto[]> {
    const limit = filters?.limit ?? 50;

    // Auto-expire stale vetoes first
    await sql`
        UPDATE ops_vetoes
        SET status = 'expired', resolved_at = NOW()
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
    `;

    if (filters?.agentId && filters?.targetType) {
        return sql<Veto[]>`
            SELECT * FROM ops_vetoes
            WHERE status = 'active'
              AND agent_id = ${filters.agentId}
              AND target_type = ${filters.targetType}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    } else if (filters?.agentId) {
        return sql<Veto[]>`
            SELECT * FROM ops_vetoes
            WHERE status = 'active'
              AND agent_id = ${filters.agentId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    } else if (filters?.targetType) {
        return sql<Veto[]>`
            SELECT * FROM ops_vetoes
            WHERE status = 'active'
              AND target_type = ${filters.targetType}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    }

    return sql<Veto[]>`
        SELECT * FROM ops_vetoes
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
}

// ─── Internal: halt target ───

async function haltTarget(
    targetType: VetoTargetType,
    targetId: string,
    reason: string,
): Promise<void> {
    const vetoReason = `Binding veto: ${reason}`;

    switch (targetType) {
        case 'proposal': {
            // Revert proposal to pending + cancel any created mission
            await sql`
                UPDATE ops_mission_proposals
                SET status = 'pending', auto_approved = false, updated_at = NOW()
                WHERE id = ${targetId}
            `;
            // Cancel any mission that was created from this proposal
            await sql`
                UPDATE ops_missions
                SET status = 'cancelled', failure_reason = ${vetoReason}, updated_at = NOW()
                WHERE proposal_id = ${targetId} AND status IN ('approved', 'running', 'blocked')
            `;
            break;
        }
        case 'mission': {
            await sql`
                UPDATE ops_missions
                SET status = 'cancelled', failure_reason = ${vetoReason}, updated_at = NOW()
                WHERE id = ${targetId} AND status IN ('approved', 'running', 'blocked')
            `;
            // Also fail any queued/running steps
            await sql`
                UPDATE ops_mission_steps
                SET status = 'failed', failure_reason = ${vetoReason}, completed_at = NOW(), updated_at = NOW()
                WHERE mission_id = ${targetId} AND status IN ('queued', 'running', 'blocked')
            `;
            break;
        }
        case 'governance': {
            await sql`
                UPDATE ops_governance_proposals
                SET status = 'rejected', resolved_at = NOW()
                WHERE id = ${targetId} AND status IN ('proposed', 'voting')
            `;
            break;
        }
        case 'step': {
            await sql`
                UPDATE ops_mission_steps
                SET status = 'failed', failure_reason = ${vetoReason}, completed_at = NOW(), updated_at = NOW()
                WHERE id = ${targetId} AND status IN ('queued', 'running', 'blocked')
            `;
            break;
        }
    }

    log.info('Target halted by binding veto', { targetType, targetId });
}
