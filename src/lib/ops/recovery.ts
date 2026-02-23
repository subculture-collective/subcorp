// Recovery — reclaim stale steps and finalize missions
import { sql } from '@/lib/db';
import { emitEvent } from './events';
import { getPolicy } from './policy';

export async function recoverStaleSteps(): Promise<{ recovered: number }> {
    const policy = await getPolicy('recovery_policy');
    const staleThresholdMinutes = (policy.stale_threshold_minutes as number) ?? 30;
    const cutoff = new Date(Date.now() - staleThresholdMinutes * 60_000);

    // Fetch running steps past the threshold, JOIN to their agent session if one exists
    const staleRows = await sql<{
        id: string;
        mission_id: string;
        session_id: string | null;
        session_status: string | null;
        session_error: string | null;
    }[]>`
        SELECT
            s.id,
            s.mission_id,
            (s.result->>'agent_session_id')::uuid AS session_id,
            sess.status AS session_status,
            sess.error AS session_error
        FROM ops_mission_steps s
        LEFT JOIN ops_agent_sessions sess
            ON sess.id = (s.result->>'agent_session_id')::uuid
        WHERE s.status = 'running'
          AND s.updated_at < ${cutoff.toISOString()}
    `;

    if (staleRows.length === 0) return { recovered: 0 };

    let recovered = 0;
    const affectedMissionIds = new Set<string>();

    for (const row of staleRows) {
        // Steps with a linked agent session: decide based on session status
        if (row.session_id) {
            if (row.session_status === 'succeeded') {
                // Session completed — finalize step as succeeded (backup finalizer)
                await sql`
                    UPDATE ops_mission_steps
                    SET status = 'succeeded',
                        completed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ${row.id}
                `;
                recovered++;
                affectedMissionIds.add(row.mission_id);
            } else if (row.session_status === 'failed' || row.session_status === 'timed_out') {
                // Session failed — propagate failure to step
                const reason = row.session_error ?? `Agent session ${row.session_status}`;
                await sql`
                    UPDATE ops_mission_steps
                    SET status = 'failed',
                        failure_reason = ${reason},
                        completed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ${row.id}
                `;
                recovered++;
                affectedMissionIds.add(row.mission_id);
            }
            // If session is still 'running' or 'pending', leave the step alone —
            // the session's own timeout (sweepStaleAgentSessions) handles that lifecycle.
        } else {
            // No linked session — dispatch itself failed or step never created a session.
            // This is genuinely stale; apply the timestamp-based timeout.
            const reason = `Recovered: step exceeded ${staleThresholdMinutes} minute timeout (no agent session)`;
            await sql`
                UPDATE ops_mission_steps
                SET status = 'failed',
                    failure_reason = ${reason},
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${row.id}
            `;
            recovered++;
            affectedMissionIds.add(row.mission_id);
        }
    }

    // Finalize affected missions
    for (const missionId of affectedMissionIds) {
        await maybeFinalializeMission(missionId);
    }

    if (recovered > 0) {
        await emitEvent({
            agent_id: 'mux',
            kind: 'stale_steps_recovered',
            title: `Recovered ${recovered} stale step(s)`,
            summary: `${recovered} steps resolved (session-aware recovery)`,
            tags: ['recovery', 'stale'],
            metadata: {
                stepIds: staleRows.filter(r => r.session_status !== 'running' && r.session_status !== 'pending').map(r => r.id),
                missionIds: [...affectedMissionIds],
                skipped: staleRows.length - recovered,
            },
        });
    }

    return { recovered };
}

export async function maybeFinalializeMission(
    missionId: string,
): Promise<void> {
    // Count pending steps (queued or running)
    const [{ count: pendingCount }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_mission_steps
        WHERE mission_id = ${missionId}
        AND status IN ('queued', 'running')
    `;

    if (pendingCount > 0) return; // Still has work to do

    // All steps done — determine outcome
    const [{ count: failedCount }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_mission_steps
        WHERE mission_id = ${missionId}
        AND status = 'failed'
    `;

    const [mission] = await sql<[{ created_by: string; title: string }]>`
        SELECT created_by, title FROM ops_missions WHERE id = ${missionId}
    `;

    if (!mission) return;

    if (failedCount > 0) {
        const failReason = `${failedCount} step(s) failed`;
        await sql`
            UPDATE ops_missions
            SET status = 'failed',
                failure_reason = ${failReason},
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = ${missionId}
        `;

        await emitEvent({
            agent_id: mission.created_by,
            kind: 'mission_failed',
            title: `Mission failed: ${mission.title}`,
            tags: ['mission', 'failed'],
            metadata: { missionId, failedSteps: failedCount },
        });
    } else {
        await sql`
            UPDATE ops_missions
            SET status = 'succeeded',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = ${missionId}
        `;

        await emitEvent({
            agent_id: mission.created_by,
            kind: 'mission_succeeded',
            title: `Mission completed: ${mission.title}`,
            tags: ['mission', 'succeeded'],
            metadata: { missionId },
        });
    }
}
