// Situational briefing — "what happened recently" context for agents
// Auto-generated summary of recent system activity, cached per agent.
import { sql } from '@/lib/db';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/lib/types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { text: string; expires: number }>();

/**
 * Build a situational briefing for an agent.
 * Summarizes recent activity so the agent knows what's been happening.
 * Cached per agent for 5 minutes.
 */
export async function buildBriefing(agentId: string): Promise<string> {
    const cached = cache.get(agentId);
    if (cached && Date.now() < cached.expires) {
        return cached.text;
    }

    const sections: string[] = [];

    // 1. Recent events (last 6 hours, grouped by agent)
    const recentEvents = await sql<
        Array<{
            agent_id: string;
            kind: string;
            title: string;
            created_at: string;
        }>
    >`
        SELECT agent_id, kind, title, created_at
        FROM ops_agent_events
        WHERE created_at > now() - interval '6 hours'
          AND agent_id NOT LIKE 'oc-%'
          AND kind NOT IN ('heartbeat', 'step_dispatched', 'missing_artifacts')
        ORDER BY created_at DESC
        LIMIT 15
    `;

    if (recentEvents.length > 0) {
        const eventLines = recentEvents.map(e => {
            const name =
                AGENTS[e.agent_id as AgentId]?.displayName ?? e.agent_id;
            const ago = timeAgo(new Date(e.created_at));
            return `- ${name}: ${e.title} (${ago})`;
        });
        sections.push(`Recent activity:\n${eventLines.join('\n')}`);
    }

    // 2. Active missions
    const activeMissions = await sql<
        Array<{ title: string; status: string; created_by: string }>
    >`
        SELECT title, status, created_by
        FROM ops_missions
        WHERE status IN ('approved', 'running')
        ORDER BY created_at DESC
        LIMIT 5
    `;

    if (activeMissions.length > 0) {
        const missionLines = activeMissions.map(m => {
            const by =
                AGENTS[m.created_by as AgentId]?.displayName ?? m.created_by;
            return `- [${m.status}] ${m.title} (by ${by})`;
        });
        sections.push(`Active missions:\n${missionLines.join('\n')}`);
    }

    // 3. Artifact stats (last 24h)
    const synthesisCount = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM ops_agent_sessions
        WHERE source = 'conversation'
          AND status = 'succeeded'
          AND completed_at > now() - interval '24 hours'
    `;

    const draftStats = await sql<Array<{ status: string; count: number }>>`
        SELECT status, COUNT(*)::int as count
        FROM ops_content_drafts
        WHERE created_at > now() - interval '24 hours'
        GROUP BY status
    `;

    const synthCount = synthesisCount[0]?.count ?? 0;
    const lines: string[] = [];
    if (synthCount > 0) {
        lines.push(`- ${synthCount} synthesis reports completed`);
    } else {
        lines.push(`- No synthesis reports yet`);
    }
    if (draftStats.length > 0) {
        const parts = draftStats.map(d => `${d.count} ${d.status}`);
        lines.push(`- Content drafts: ${parts.join(', ')}`);
    }
    sections.push(`Artifacts (last 24h):\n${lines.join('\n')}`);

    // 4. Recent conversations this agent wasn't part of
    const recentConversations = await sql<
        Array<{
            topic: string;
            format: string;
            participants: string[];
            turn_count: number;
        }>
    >`
        SELECT topic, format, participants, turn_count
        FROM ops_roundtable_sessions
        WHERE status = 'completed'
          AND created_at > now() - interval '12 hours'
          AND NOT (participants @> ARRAY[${agentId}]::text[])
        ORDER BY created_at DESC
        LIMIT 3
    `;

    if (recentConversations.length > 0) {
        const convLines = recentConversations.map(c => {
            const names = c.participants
                .map(p => AGENTS[p as AgentId]?.displayName ?? p)
                .join(', ');
            return `- "${c.topic}" (${c.format}, ${c.turn_count} turns) — ${names}`;
        });
        sections.push(
            `Recent conversations you missed:\n${convLines.join('\n')}`,
        );
    }

    // 5. Pending proposals
    const pendingProposals = await sql<
        Array<{ title: string; agent_id: string }>
    >`
        SELECT title, agent_id
        FROM ops_mission_proposals
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 3
    `;

    if (pendingProposals.length > 0) {
        const propLines = pendingProposals.map(p => {
            const by = AGENTS[p.agent_id as AgentId]?.displayName ?? p.agent_id;
            return `- ${p.title} (proposed by ${by})`;
        });
        sections.push(`Pending proposals:\n${propLines.join('\n')}`);
    }

    // 6. Your pending deliverables — steps assigned to this agent that need doing
    const pendingSteps = await sql<
        Array<{ kind: string; mission_title: string; status: string }>
    >`
        SELECT s.kind, m.title as mission_title, s.status
        FROM ops_mission_steps s
        JOIN ops_missions m ON m.id = s.mission_id
        WHERE s.assigned_agent = ${agentId}
          AND s.status IN ('queued', 'running')
        ORDER BY s.created_at ASC
        LIMIT 5
    `;

    if (pendingSteps.length > 0) {
        const stepLines = pendingSteps.map(
            s => `- [${s.status}] ${s.kind}: ${s.mission_title}`,
        );
        sections.push(`Your pending deliverables:\n${stepLines.join('\n')}`);
    }

    const text =
        sections.length > 0 ? sections.join('\n\n') : 'No recent activity.';

    cache.set(agentId, { text, expires: Date.now() + CACHE_TTL_MS });
    return text;
}

function timeAgo(date: Date): string {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
