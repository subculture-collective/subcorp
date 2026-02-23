// Unified Worker — single process that handles all background queues
// Replaces: roundtable-worker, mission-worker, initiative-worker
// Adds: agent-session queue (cron-triggered tool-augmented sessions)
//
// Imports directly from src/lib/ — no more 4,000 lines of duplicated code.
//
// Run: node scripts/unified-worker/dist/index.js

import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs/promises';
import path from 'path';
import { orchestrateConversation } from '../../src/lib/roundtable/orchestrator';
import { executeAgentSession } from '../../src/lib/tools/agent-session';
import { createLogger } from '../../src/lib/logger';
import { FORMATS } from '../../src/lib/roundtable/formats';
import type { RoundtableSession } from '../../src/lib/types';
import type { AgentSession } from '../../src/lib/tools/types';
import type { ConversationFormat, StepKind } from '../../src/lib/types';

const log = createLogger({ service: 'unified-worker' });

// ─── Config ───

const WORKER_ID = `unified-${process.pid}`;

if (!process.env.DATABASE_URL) {
    log.fatal('Missing DATABASE_URL');
    process.exit(1);
}

if (!process.env.OPENROUTER_API_KEY) {
    log.fatal('Missing OPENROUTER_API_KEY');
    process.exit(1);
}

// Direct DB connection for queue polling (separate from the app's pool)
const sql = postgres(process.env.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
});

// ─── Queue handlers ───

/** Poll and process pending agent sessions (highest priority) */
async function pollAgentSessions(): Promise<boolean> {
    const [session] = await sql<AgentSession[]>`
        UPDATE ops_agent_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = (
            SELECT id FROM ops_agent_sessions
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    `;

    if (!session) return false;

    log.info('Processing agent session', {
        sessionId: session.id,
        agent: session.agent_id,
        source: session.source,
    });

    // Refresh updated_at on any mission step linked to this session,
    // so recovery timeout measures from when work actually starts, not dispatch time
    if (session.source === 'mission') {
        await sql`
            UPDATE ops_mission_steps
            SET updated_at = NOW()
            WHERE status = 'running'
              AND result->>'agent_session_id' = ${session.id}
        `;
    }

    try {
        await executeAgentSession(session);

        // Post artifact to Discord if this was a conversation synthesis session
        if (session.source === 'conversation' && session.source_id) {
            // Read the completed session to get the result text
            const [completed] = await sql<
                [{ result: Record<string, unknown> | null }]
            >`
                SELECT result FROM ops_agent_sessions WHERE id = ${session.id}
            `;
            const artifactText = (
                (completed?.result as Record<string, string>)?.text ??
                (completed?.result as Record<string, string>)?.output ??
                ''
            ).trim();

            // Post to Discord
            if (artifactText && artifactText.length > 20) {
                try {
                    const { postArtifactToDiscord } =
                        await import('../../src/lib/discord/roundtable');
                    await postArtifactToDiscord(
                        session.source_id,
                        '',
                        artifactText,
                    );
                } catch {
                    // Non-fatal — Discord posting should never stall the worker
                }
            }

            // Extract action items from artifact and create mission proposals
            if (artifactText && artifactText.length > 50) {
                try {
                    // Look up the roundtable session to get format and topic
                    const [rtSession] = await sql<
                        [{ format: string; topic: string } | undefined]
                    >`
                        SELECT format, topic FROM ops_roundtable_sessions
                        WHERE id = ${session.source_id}
                    `;
                    if (rtSession) {
                        const { extractActionsFromArtifact } =
                            await import('../../src/lib/roundtable/action-extractor');
                        const actionCount = await extractActionsFromArtifact(
                            session.source_id,
                            rtSession.format,
                            artifactText,
                            rtSession.topic,
                        );
                        if (actionCount > 0) {
                            log.info(
                                'Actions extracted from roundtable artifact',
                                {
                                    sessionId: session.id,
                                    roundtableId: session.source_id,
                                    format: rtSession.format,
                                    actionCount,
                                },
                            );
                        }
                    }
                } catch (extractErr) {
                    // Non-fatal — action extraction should never stall the worker
                    log.error('Action extraction failed (non-fatal)', {
                        error: extractErr,
                        sessionId: session.id,
                    });
                }
            }

            // Write artifact to workspace file
            if (artifactText && artifactText.length > 50 && session.source_id) {
                try {
                    const [rtSession] = await sql<
                        [{ format: string; topic: string } | undefined]
                    >`
                        SELECT format, topic FROM ops_roundtable_sessions
                        WHERE id = ${session.source_id}
                    `;
                    if (rtSession) {
                        const formatConfig =
                            FORMATS[rtSession.format as ConversationFormat];
                        const artifact = formatConfig?.artifact;
                        if (artifact && artifact.type !== 'none') {
                            const outputDir = artifact.outputDir;
                            const dateStr = new Date()
                                .toISOString()
                                .slice(0, 10);
                            const topicSlug = rtSession.topic
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/^-|-$/g, '')
                                .slice(0, 40);
                            const filename = `${dateStr}__${rtSession.format}__${artifact.type}__${topicSlug}__${session.agent_id}__v01.md`;
                            const filePath = path.join(
                                '/workspace',
                                outputDir,
                                filename,
                            );

                            await fs.mkdir(path.dirname(filePath), {
                                recursive: true,
                            });
                            // Skip if synthesis agent already wrote the file via file_write
                            const fileExists = await fs.access(filePath).then(
                                () => true,
                                () => false,
                            );
                            if (fileExists) {
                                log.info(
                                    'Artifact file already exists (written by synthesis agent)',
                                    {
                                        sessionId: session.id,
                                        path: filePath,
                                    },
                                );
                            } else {
                                await fs.writeFile(
                                    filePath,
                                    artifactText,
                                    'utf-8',
                                );
                                log.info('Artifact file written to workspace', {
                                    sessionId: session.id,
                                    path: filePath,
                                    format: rtSession.format,
                                    artifactType: artifact.type,
                                });
                            }
                        }
                    }
                } catch (fileErr) {
                    // Non-fatal — file write should never stall the worker
                    log.error('Artifact file write failed (non-fatal)', {
                        error: fileErr,
                        sessionId: session.id,
                    });
                }
            }

            // Create content draft from synthesis output
            if (artifactText && artifactText.length > 50 && session.source_id) {
                try {
                    // Dedup check — skip if draft already exists for this roundtable session
                    const [existingDraft] = await sql<
                        [{ id: string } | undefined]
                    >`
                        SELECT id FROM ops_content_drafts
                        WHERE source_session_id = ${session.source_id}
                        LIMIT 1
                    `;
                    if (!existingDraft) {
                        const [rtSession] = await sql<
                            [{ format: string; topic: string } | undefined]
                        >`
                            SELECT format, topic FROM ops_roundtable_sessions
                            WHERE id = ${session.source_id}
                        `;
                        // Only create drafts from productive formats. Skip content_review
                        // (would cause infinite review→draft→review), checkin, watercooler, standup
                        // (lightweight status formats that don't produce draftable content).
                        const DRAFT_ELIGIBLE_FORMATS = new Set([
                            'writing_room',
                            'deep_dive',
                            'strategy',
                            'debate',
                            'brainstorm',
                            'planning',
                            'shipping',
                            'reframe',
                            'risk_review',
                            'cross_exam',
                        ]);
                        if (
                            rtSession &&
                            DRAFT_ELIGIBLE_FORMATS.has(rtSession.format)
                        ) {
                            const formatConfig =
                                FORMATS[rtSession.format as ConversationFormat];
                            const artifact = formatConfig?.artifact;
                            const contentType =
                                artifact?.type && artifact.type !== 'none' ?
                                    artifact.type
                                :   'report';

                            // Extract title from first markdown heading or generate from topic
                            const headingMatch =
                                artifactText.match(/^#\s+(.+)$/m);
                            const title =
                                headingMatch?.[1]?.trim() ||
                                `${contentType.charAt(0).toUpperCase() + contentType.slice(1)}: ${rtSession.topic.slice(0, 100)}`;

                            const [draft] = await sql<[{ id: string }]>`
                                INSERT INTO ops_content_drafts (
                                    author_agent, content_type, title, body, status,
                                    source_session_id, metadata
                                ) VALUES (
                                    ${session.agent_id},
                                    ${contentType},
                                    ${title.slice(0, 500)},
                                    ${artifactText.slice(0, 50000)},
                                    'draft',
                                    ${session.source_id},
                                    ${sql.json({
                                        format: rtSession.format,
                                        topic: rtSession.topic,
                                        artifactType: contentType,
                                        synthesisSessionId: session.id,
                                    })}
                                )
                                RETURNING id
                            `;

                            log.info('Content draft created from synthesis', {
                                draftId: draft.id,
                                sessionId: session.id,
                                roundtableId: session.source_id,
                                contentType,
                                author: session.agent_id,
                            });

                            // Emit content_draft_created event for trigger system
                            try {
                                const { emitEvent } =
                                    await import('../../src/lib/ops/events');
                                await emitEvent({
                                    agent_id: session.agent_id,
                                    kind: 'content_draft_created',
                                    title: `Content draft created: ${title.slice(0, 100)}`,
                                    summary: `${contentType} by ${session.agent_id} from ${rtSession.format} synthesis`,
                                    tags: ['content', 'draft', contentType],
                                    metadata: {
                                        draftId: draft.id,
                                        sessionId: session.source_id,
                                        contentType,
                                    },
                                });
                            } catch {
                                // Non-fatal — event emission should never stall the worker
                            }
                        }
                    }
                } catch (draftErr) {
                    // Non-fatal — content draft creation should never stall the worker
                    log.error('Content draft creation failed (non-fatal)', {
                        error: draftErr,
                        sessionId: session.id,
                    });
                }
            }
        }
    } catch (err) {
        log.error('Agent session execution failed', {
            error: err,
            sessionId: session.id,
        });
        await sql`
            UPDATE ops_agent_sessions
            SET status = 'failed',
                error = ${(err as Error).message},
                completed_at = NOW()
            WHERE id = ${session.id}
        `;
    }

    return true;
}

/** Poll and process pending roundtable conversations */
async function pollRoundtables(): Promise<boolean> {
    const rows = await sql<RoundtableSession[]>`
        UPDATE ops_roundtable_sessions
        SET status = 'running'
        WHERE id = (
            SELECT id FROM ops_roundtable_sessions
            WHERE status = 'pending'
            AND scheduled_for <= NOW()
            ORDER BY
                CASE WHEN source = 'user_question' THEN 0 ELSE 1 END,
                created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    `;

    const session = rows[0];
    if (!session) return false;

    // Reset to pending so orchestrateConversation can set it properly
    await sql`
        UPDATE ops_roundtable_sessions
        SET status = 'pending'
        WHERE id = ${session.id}
    `;

    log.info('Processing roundtable', {
        sessionId: session.id,
        format: session.format,
        topic: session.topic.slice(0, 80),
    });

    try {
        await orchestrateConversation(session, true);

        // Content Pipeline: process completed content_review sessions
        if (session.format === 'content_review') {
            try {
                const { processReviewSession } =
                    await import('../../src/lib/ops/content-pipeline');
                await processReviewSession(session.id);
                log.info('Content review processed', {
                    sessionId: session.id,
                });
            } catch (reviewErr) {
                // Non-fatal — review processing should never stall the worker
                log.error('Content review processing failed (non-fatal)', {
                    error: reviewErr,
                    sessionId: session.id,
                });
            }
        }

        // Governance: extract votes from debate sessions tied to a governance proposal
        const proposalId = (session.metadata as Record<string, unknown>)
            ?.governance_proposal_id as string | undefined;
        if (session.format === 'debate' && proposalId) {
            try {
                const { castGovernanceVote } =
                    await import('../../src/lib/ops/governance');

                // Fetch the debate turns
                const turns = await sql<
                    Array<{ agent_id: string; dialogue: string }>
                >`
                    SELECT agent_id, dialogue FROM ops_roundtable_turns
                    WHERE session_id = ${session.id}
                    ORDER BY turn_number ASC
                `;

                if (turns.length > 0) {
                    // Extract votes by keyword-parsing each agent's last turn
                    const agentIds = [...new Set(turns.map(t => t.agent_id))];
                    let voteCount = 0;

                    for (const agentId of agentIds) {
                        const lastTurn = [...turns]
                            .reverse()
                            .find(t => t.agent_id === agentId);
                        if (!lastTurn) continue;

                        const upper = lastTurn.dialogue.toUpperCase();
                        const approveIdx = upper.lastIndexOf('APPROVE');
                        const rejectIdx = upper.lastIndexOf('REJECT');
                        const hasApprove =
                            approveIdx !== -1 &&
                            !upper.includes('NOT APPROVE') &&
                            !upper.includes("DON'T APPROVE");
                        const hasReject = rejectIdx !== -1;

                        let vote: 'approve' | 'reject' | null = null;
                        if (hasApprove && hasReject) {
                            vote =
                                approveIdx > rejectIdx ? 'approve' : 'reject';
                        } else if (hasApprove) {
                            vote = 'approve';
                        } else if (hasReject) {
                            vote = 'reject';
                        }

                        if (vote) {
                            const reason = lastTurn.dialogue.slice(0, 200);
                            await castGovernanceVote(
                                proposalId,
                                agentId,
                                vote,
                                reason,
                            );
                            voteCount++;
                        }
                    }

                    log.info('Governance votes extracted from debate', {
                        sessionId: session.id,
                        proposalId,
                        voteCount,
                    });
                }
            } catch (govErr) {
                // Non-fatal — governance vote extraction should never stall the worker
                log.error('Governance vote extraction failed (non-fatal)', {
                    error: govErr,
                    sessionId: session.id,
                    proposalId,
                });
            }
        }

        // Rebellion: resolve rebellion if cross-exam about a rebelling agent completed
        const rebellionAgentId = (session.metadata as Record<string, unknown>)
            ?.rebellion_agent_id as string | undefined;
        if (session.format === 'cross_exam' && rebellionAgentId) {
            try {
                const { endRebellion, isAgentRebelling } =
                    await import('../../src/lib/ops/rebellion');
                const stillRebelling = await isAgentRebelling(rebellionAgentId);
                if (stillRebelling) {
                    await endRebellion(
                        rebellionAgentId,
                        'cross_exam_completed',
                    );
                    log.info('Rebellion resolved via cross-exam', {
                        sessionId: session.id,
                        rebellionAgentId,
                    });
                }
            } catch (rebellionErr) {
                // Non-fatal — rebellion resolution should never stall the worker
                log.error(
                    'Rebellion resolution from cross-exam failed (non-fatal)',
                    {
                        error: rebellionErr,
                        sessionId: session.id,
                        rebellionAgentId,
                    },
                );
            }
        }
    } catch (err) {
        log.error('Roundtable orchestration failed', {
            error: err,
            sessionId: session.id,
        });
    }

    return true;
}

const MAX_PARALLEL_STEPS = 3;

/** Poll and process queued mission steps — routes through agent sessions for tool access */
async function pollMissionSteps(): Promise<boolean> {
    // Grab up to MAX_PARALLEL_STEPS independent steps in one batch
    const steps = await sql`
        UPDATE ops_mission_steps
        SET status = 'running',
            reserved_by = ${WORKER_ID},
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = ANY(
            ARRAY(
                SELECT s.id FROM ops_mission_steps s
                WHERE s.status = 'queued'
                AND NOT EXISTS (
                    SELECT 1 FROM ops_mission_steps dep
                    WHERE dep.id = ANY(s.depends_on)
                    AND dep.status != 'succeeded'
                )
                ORDER BY s.created_at ASC
                LIMIT ${MAX_PARALLEL_STEPS}
                FOR UPDATE SKIP LOCKED
            )
        )
        RETURNING *
    `;

    if (steps.length === 0) return false;

    // Dispatch all independent steps concurrently
    await Promise.allSettled(
        (steps as unknown as MissionStepRow[]).map(step =>
            dispatchMissionStep(step),
        ),
    );
    return true;
}

/** Shape of a row from ops_mission_steps RETURNING * */
interface MissionStepRow {
    id: string;
    mission_id: string;
    kind: StepKind;
    assigned_agent: string | null;
    payload: Record<string, unknown> | null;
    output_path: string | null;
    status: string;
    result: string | null;
    session_status: string | null;
    [key: string]: unknown;
}

/** Dispatch a single mission step (extracted for parallel use) */
async function dispatchMissionStep(step: MissionStepRow): Promise<void> {
    log.info('Processing mission step', {
        stepId: step.id as string,
        kind: step.kind as string,
        missionId: step.mission_id as string,
    });

    // ── Veto gate: check for active vetoes before dispatching ──
    try {
        const { hasActiveVeto } = await import('../../src/lib/ops/veto');

        const missionVeto = await hasActiveVeto('mission', step.mission_id);
        if (missionVeto.vetoed) {
            log.info('Mission step blocked by veto on mission', {
                stepId: step.id,
                missionId: step.mission_id,
                vetoId: missionVeto.vetoId,
                severity: missionVeto.severity,
            });
            await sql`
                UPDATE ops_mission_steps
                SET status = 'failed',
                    failure_reason = ${`Blocked by ${missionVeto.severity} veto on mission: ${missionVeto.reason}`},
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;
            await finalizeMissionIfComplete(step.mission_id);
            return;
        }

        const stepVeto = await hasActiveVeto('step', step.id);
        if (stepVeto.vetoed) {
            log.info('Mission step blocked by veto on step', {
                stepId: step.id,
                vetoId: stepVeto.vetoId,
                severity: stepVeto.severity,
            });
            await sql`
                UPDATE ops_mission_steps
                SET status = 'failed',
                    failure_reason = ${`Blocked by ${stepVeto.severity} veto on step: ${stepVeto.reason}`},
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;
            await finalizeMissionIfComplete(step.mission_id);
            return;
        }
    } catch (vetoErr) {
        // Non-fatal — if veto check fails, allow step to proceed
        log.error('Veto check failed (non-fatal, allowing step)', {
            error: vetoErr,
            stepId: step.id,
        });
    }

    try {
        // Load mission context
        const [mission] = await sql`
            SELECT title, created_by FROM ops_missions WHERE id = ${step.mission_id}
        `;

        // Use assigned_agent if set, otherwise fall back to mission creator
        const agentId = step.assigned_agent ?? mission?.created_by ?? 'mux';

        const { emitEvent } = await import('../../src/lib/ops/events');

        // ── Special case: memory_archaeology — call performDig() directly ──
        if (step.kind === 'memory_archaeology') {
            const { performDig } =
                await import('../../src/lib/ops/memory-archaeology');
            const result = await performDig({
                agent_id: agentId,
                max_memories: 100,
            });

            await sql`
                UPDATE ops_mission_steps
                SET status = 'succeeded',
                    result = ${sql.json({
                        dig_id: result.dig_id,
                        finding_count: result.findings.length,
                        memories_analyzed: result.memories_analyzed,
                    })}::jsonb,
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;

            await emitEvent({
                agent_id: agentId,
                kind: 'archaeology_complete',
                title: `Memory archaeology dig completed — ${result.findings.length} findings`,
                tags: ['archaeology', 'memory', 'complete'],
                metadata: {
                    dig_id: result.dig_id,
                    finding_count: result.findings.length,
                    memories_analyzed: result.memories_analyzed,
                    missionId: step.mission_id,
                    stepId: step.id,
                },
            });

            await finalizeMissionIfComplete(step.mission_id);
            return;
        }

        // ── Special case: convene_roundtable — INSERT a roundtable session directly ──
        if (step.kind === 'convene_roundtable') {
            const payload = (step.payload ?? {}) as Record<string, unknown>;
            const format = (payload.format as string) ?? 'brainstorm';
            const topic =
                (payload.topic as string) ?? mission?.title ?? 'Roundtable';
            const participants = (payload.participants as string[]) ?? [
                'chora',
                'subrosa',
                'thaum',
                'praxis',
                'mux',
            ];

            await sql`
                INSERT INTO ops_roundtable_sessions (
                    format, topic, participants, status, scheduled_for, source, metadata
                ) VALUES (
                    ${format},
                    ${topic},
                    ${participants},
                    'pending',
                    NOW(),
                    'mission',
                    ${sql.json({ mission_id: step.mission_id, step_id: step.id })}::jsonb
                )
            `;

            await sql`
                UPDATE ops_mission_steps
                SET status = 'succeeded',
                    result = ${sql.json({ action: 'roundtable_enqueued', format, topic })}::jsonb,
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;

            await emitEvent({
                agent_id: agentId,
                kind: 'roundtable_enqueued',
                title: `Roundtable enqueued: ${format} — ${topic.slice(0, 80)}`,
                tags: ['mission', 'roundtable', 'enqueued'],
                metadata: {
                    missionId: step.mission_id,
                    stepId: step.id,
                    format,
                    topic,
                },
            });

            await finalizeMissionIfComplete(step.mission_id);
            return;
        }

        const { buildStepPrompt } =
            await import('../../src/lib/ops/step-prompts');

        // Build a tool-aware prompt for this step kind (with template version tracking)
        const { prompt, templateVersion } = await buildStepPrompt(
            step.kind,
            {
                missionTitle: mission?.title ?? 'Unknown',
                agentId,
                payload: step.payload ?? {},
                outputPath: step.output_path ?? undefined,
            },
            { withVersion: true },
        );

        // Record template version on the step for outcome tracking
        if (templateVersion != null) {
            await sql`
                UPDATE ops_mission_steps
                SET template_version = ${templateVersion}
                WHERE id = ${step.id}
            `;
        }

        // Grant temporary write access if the step writes outside base ACLs
        if (step.output_path) {
            const outputPrefix =
                step.output_path.endsWith('/') ?
                    step.output_path
                :   step.output_path + '/';
            try {
                await sql`
                    INSERT INTO ops_acl_grants (agent_id, path_prefix, source, source_id, expires_at)
                    VALUES (${agentId}, ${outputPrefix}, 'mission', ${step.mission_id}::uuid, NOW() + INTERVAL '4 hours')
                `;
            } catch (grantErr) {
                log.warn('Failed to create ACL grant for step', {
                    error: grantErr,
                    agentId,
                    outputPath: step.output_path,
                });
            }
        }

        // Create an agent session so the step gets full tool access
        const [session] = await sql`
            INSERT INTO ops_agent_sessions (
                agent_id, prompt, source, source_id,
                timeout_seconds, max_tool_rounds, status
            ) VALUES (
                ${agentId},
                ${prompt},
                'mission',
                ${step.mission_id},
                1800,
                15,
                'pending'
            )
            RETURNING id
        `;

        // Mark step with the agent session reference and persist resolved agent
        await sql`
            UPDATE ops_mission_steps
            SET result = ${sql.json({ agent_session_id: session.id, agent: agentId })}::jsonb,
                assigned_agent = COALESCE(assigned_agent, ${agentId}),
                updated_at = NOW()
            WHERE id = ${step.id}
        `;

        // Keep the step in 'running' status until the agent session completes.
        // The step will be finalized by a separate process that monitors agent sessions,
        // or can be manually updated based on the session result.
        // This prevents downstream steps from starting before the session completes.

        await emitEvent({
            agent_id: agentId,
            kind: 'step_dispatched',
            title: `Step dispatched to agent session: ${step.kind}`,
            tags: ['mission', 'step', 'dispatched'],
            metadata: {
                missionId: step.mission_id,
                stepId: step.id,
                kind: step.kind,
                agentSessionId: session.id,
            },
        });

        // Note: Do NOT call finalizeMissionIfComplete here since the step is still running
    } catch (err) {
        log.error('Mission step failed', { error: err, stepId: step.id });

        // Get the agent session ID if it was created before the error
        const stepData = await sql<Array<{ result: Record<string, unknown> }>>`
            SELECT result FROM ops_mission_steps WHERE id = ${step.id}
        `;
        const agentSessionId = (stepData[0]?.result as Record<string, unknown>)
            ?.agent_session_id as string | undefined;

        await sql`
            UPDATE ops_mission_steps
            SET status = 'failed',
                failure_reason = ${(err as Error).message},
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = ${step.id}
        `;

        // Ensure any agent session created for this step is not left pending
        if (agentSessionId) {
            await sql`
                UPDATE ops_agent_sessions
                SET status = 'failed',
                    error = ${(err as Error).message},
                    completed_at = NOW()
                WHERE id = ${agentSessionId}
                  AND status = 'pending'
            `;
        }

        await finalizeMissionIfComplete(step.mission_id as string);
    }
}

// Step kinds that produce research output → 'research' channel
const RESEARCH_STEP_KINDS = new Set([
    'research_topic',
    'scan_signals',
    'analyze_discourse',
    'classify_pattern',
    'trace_incentive',
    'identify_assumption',
]);

// Step kinds that produce insight/synthesis output → 'insights' channel
const INSIGHT_STEP_KINDS = new Set([
    'distill_insight',
    'consolidate_memory',
    'document_lesson',
    'memory_archaeology',
]);

/** Finalize mission steps based on their agent session status */
async function finalizeMissionSteps(): Promise<boolean> {
    // Find running steps with their associated agent session status in a single query
    const steps = await sql<
        Array<{
            id: string;
            mission_id: string;
            kind: string;
            assigned_agent: string | null;
            session_agent_id: string | null;
            session_status: string | null;
            session_error: string | null;
            session_summary: string | null;
        }>
    >`
        SELECT
            s.id,
            s.mission_id,
            s.kind,
            s.assigned_agent,
            sess.agent_id as session_agent_id,
            sess.status as session_status,
            sess.error as session_error,
            CASE WHEN sess.status = 'succeeded'
                THEN LEFT(sess.result->>'summary', 2000)
                ELSE NULL
            END as session_summary
        FROM ops_mission_steps s
        LEFT JOIN ops_agent_sessions sess ON sess.id = (s.result->>'agent_session_id')::uuid
        WHERE s.status = 'running'
        AND s.result->>'agent_session_id' IS NOT NULL
    `;

    if (steps.length === 0) return false;

    let finalized = 0;
    for (const step of steps) {
        // Skip if session not found or still running/pending
        if (!step.session_status) continue;

        if (step.session_status === 'succeeded') {
            await sql`
                UPDATE ops_mission_steps
                SET status = 'succeeded',
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;
            finalized++;

            // Emit step-kind-specific events for research/insights channels
            const resolvedAgent = step.assigned_agent || step.session_agent_id;
            if (resolvedAgent) {
                const { emitEvent: emitStepEvent } =
                    await import('../../src/lib/ops/events');
                if (RESEARCH_STEP_KINDS.has(step.kind)) {
                    await emitStepEvent({
                        agent_id: resolvedAgent,
                        kind: 'research_completed',
                        title: `Research completed: ${step.kind}`,
                        summary: step.session_summary || undefined,
                        tags: ['research', step.kind, 'completed'],
                        metadata: {
                            missionId: step.mission_id,
                            stepId: step.id,
                            stepKind: step.kind,
                        },
                    });
                } else if (INSIGHT_STEP_KINDS.has(step.kind)) {
                    await emitStepEvent({
                        agent_id: resolvedAgent,
                        kind: 'insight_generated',
                        title: `Insight generated: ${step.kind}`,
                        summary: step.session_summary || undefined,
                        tags: ['insight', step.kind, 'completed'],
                        metadata: {
                            missionId: step.mission_id,
                            stepId: step.id,
                            stepKind: step.kind,
                        },
                    });
                }
            }

            await finalizeMissionIfComplete(step.mission_id);
        } else if (
            step.session_status === 'failed' ||
            step.session_status === 'timed_out'
        ) {
            await sql`
                UPDATE ops_mission_steps
                SET status = 'failed',
                    failure_reason = ${step.session_error ?? (step.session_status === 'timed_out' ? 'Agent session timed out' : 'Agent session failed')},
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;
            finalized++;
            await finalizeMissionIfComplete(step.mission_id);
        }
        // If still running/pending, leave it alone
    }

    return finalized > 0;
}

/** Poll and process pending initiatives */
async function pollInitiatives(): Promise<boolean> {
    const [entry] = await sql`
        UPDATE ops_initiative_queue
        SET status = 'processing'
        WHERE id = (
            SELECT id FROM ops_initiative_queue
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    `;

    if (!entry) return false;

    log.info('Processing initiative', {
        entryId: entry.id,
        agent: entry.agent_id,
    });

    try {
        // ─── Agent Design Proposal (Phase 14) ───
        // If the initiative context specifies agent_design_proposal action,
        // delegate to the agent-designer module instead of generic initiative flow.
        const initiativeAction = (entry.context as Record<string, unknown>)
            ?.action;
        if (initiativeAction === 'agent_design_proposal') {
            log.info('Processing agent design proposal', {
                entryId: entry.id,
                agent: entry.agent_id,
            });
            const { generateAgentProposal } =
                await import('../../src/lib/ops/agent-designer');
            const proposal = await generateAgentProposal(entry.agent_id);
            await sql`
                UPDATE ops_initiative_queue
                SET status = 'completed',
                    processed_at = NOW(),
                    result = ${sql.json({
                        type: 'agent_design_proposal',
                        proposalId: proposal.id,
                        agentName: proposal.agent_name,
                    })}::jsonb
                WHERE id = ${entry.id}
            `;
            return true;
        }

        // ─── Memory Archaeology (Phase 15) ───
        if (initiativeAction === 'memory_archaeology') {
            log.info('Processing memory archaeology dig', {
                entryId: entry.id,
                agent: entry.agent_id,
            });
            const { performDig } =
                await import('../../src/lib/ops/memory-archaeology');
            const maxMemories =
                ((entry.context as Record<string, unknown>)
                    ?.max_memories as number) ?? 100;

            // Rotate agents: cycle through agents with memories
            const agentRows = await sql<{ agent_id: string }[]>`
                SELECT DISTINCT agent_id FROM ops_agent_memory
                WHERE superseded_by IS NULL
                ORDER BY agent_id
            `;
            const agentIds = agentRows.map(r => r.agent_id);
            const weekNumber = Math.floor(Date.now() / (7 * 86_400_000));
            const targetAgent =
                agentIds.length > 0 ?
                    agentIds[weekNumber % agentIds.length]
                :   entry.agent_id;

            const result = await performDig({
                agent_id: targetAgent,
                max_memories: maxMemories,
            });
            await sql`
                UPDATE ops_initiative_queue
                SET status = 'completed',
                    processed_at = NOW(),
                    result = ${sql.json({
                        type: 'memory_archaeology',
                        dig_id: result.dig_id,
                        finding_count: result.findings.length,
                        memories_analyzed: result.memories_analyzed,
                        target_agent: targetAgent,
                    })}::jsonb
                WHERE id = ${entry.id}
            `;
            return true;
        }

        const { llmGenerate } = await import('../../src/lib/llm/client');
        const { getVoice } = await import('../../src/lib/roundtable/voices');

        const voice = getVoice(entry.agent_id);
        const memories = entry.context?.memories ?? [];

        // ─── Template-based proposal generation ───
        // Each agent's role maps to preferred step kinds and mission templates
        const AGENT_MISSION_TEMPLATES: Record<
            string,
            Array<{
                title: string;
                description: string;
                steps: Array<{ kind: StepKind; payload: { topic: string } }>;
            }>
        > = {
            chora: [
                {
                    title: 'Pattern analysis of recent collective activity',
                    description:
                        'Trace structural patterns in our recent operations',
                    steps: [
                        {
                            kind: 'scan_signals',
                            payload: {
                                topic: 'recent collective patterns and trends',
                            },
                        },
                        {
                            kind: 'distill_insight',
                            payload: {
                                topic: 'synthesize findings into actionable patterns',
                            },
                        },
                    ],
                },
                {
                    title: 'Map dependency chains in current workflows',
                    description:
                        'Identify fragile dependencies and single points of failure',
                    steps: [
                        {
                            kind: 'research_topic',
                            payload: { topic: 'current workflow dependencies' },
                        },
                        {
                            kind: 'document_lesson',
                            payload: { topic: 'dependency analysis findings' },
                        },
                    ],
                },
                {
                    title: 'Diagnose recurring operational friction',
                    description:
                        'Investigate why certain processes keep stalling',
                    steps: [
                        {
                            kind: 'audit_system',
                            payload: { topic: 'operational bottlenecks' },
                        },
                        {
                            kind: 'distill_insight',
                            payload: { topic: 'root cause analysis' },
                        },
                    ],
                },
            ],
            subrosa: [
                {
                    title: 'Threat model review of current systems',
                    description: 'Evaluate exposure and adversarial risk',
                    steps: [
                        {
                            kind: 'audit_system',
                            payload: { topic: 'security threat modeling' },
                        },
                        {
                            kind: 'document_lesson',
                            payload: { topic: 'threat assessment findings' },
                        },
                    ],
                },
                {
                    title: 'Review information exposure surfaces',
                    description:
                        'Assess what we reveal publicly and whether it is appropriate',
                    steps: [
                        {
                            kind: 'scan_signals',
                            payload: { topic: 'public information exposure' },
                        },
                        {
                            kind: 'critique_content',
                            payload: { topic: 'exposure risk assessment' },
                        },
                    ],
                },
            ],
            thaum: [
                {
                    title: 'Reframe a stalled initiative',
                    description:
                        'Apply lateral thinking to an initiative that lost momentum',
                    steps: [
                        {
                            kind: 'research_topic',
                            payload: {
                                topic: 'stalled initiatives needing reframe',
                            },
                        },
                        {
                            kind: 'draft_essay',
                            payload: { topic: 'alternative framing proposal' },
                        },
                    ],
                },
                {
                    title: 'Cross-domain insight synthesis',
                    description:
                        'Connect ideas from different domains to generate novel approaches',
                    steps: [
                        {
                            kind: 'scan_signals',
                            payload: { topic: 'cross-domain patterns' },
                        },
                        {
                            kind: 'distill_insight',
                            payload: { topic: 'novel synthesis' },
                        },
                    ],
                },
            ],
            praxis: [
                {
                    title: 'Ship check on incomplete deliverables',
                    description:
                        'Audit what is close to done and push it over the line',
                    steps: [
                        {
                            kind: 'audit_system',
                            payload: { topic: 'incomplete deliverables' },
                        },
                        {
                            kind: 'patch_code',
                            payload: { topic: 'finish pending work' },
                        },
                    ],
                },
                {
                    title: 'Convert recent strategy into tasks',
                    description:
                        'Turn strategic discussions into concrete, assigned work',
                    steps: [
                        {
                            kind: 'research_topic',
                            payload: { topic: 'recent strategy decisions' },
                        },
                        {
                            kind: 'document_lesson',
                            payload: {
                                topic: 'task breakdown and assignments',
                            },
                        },
                    ],
                },
            ],
            mux: [
                {
                    title: 'Consolidate and organize recent outputs',
                    description: 'Clean up and structure recent work products',
                    steps: [
                        {
                            kind: 'consolidate_memory',
                            payload: { topic: 'recent output organization' },
                        },
                        {
                            kind: 'document_lesson',
                            payload: { topic: 'output catalog update' },
                        },
                    ],
                },
                {
                    title: 'Draft status report on active missions',
                    description:
                        'Compile current mission progress into a clear report',
                    steps: [
                        {
                            kind: 'audit_system',
                            payload: { topic: 'active mission status' },
                        },
                        {
                            kind: 'draft_thread',
                            payload: { topic: 'mission status summary' },
                        },
                    ],
                },
            ],
            primus: [
                {
                    title: 'Evaluate collective alignment with core mission',
                    description:
                        'Assess whether recent activity serves the stated mission',
                    steps: [
                        {
                            kind: 'scan_signals',
                            payload: { topic: 'mission alignment assessment' },
                        },
                        {
                            kind: 'distill_insight',
                            payload: { topic: 'alignment findings' },
                        },
                    ],
                },
            ],
        };

        const templates =
            AGENT_MISSION_TEMPLATES[entry.agent_id] ??
            AGENT_MISSION_TEMPLATES.mux;

        // Enrich topic with memory context if available
        let memoryHint = '';
        if (Array.isArray(memories) && memories.length > 0) {
            const recentMemory = (memories as Array<{ content: string }>)[0];
            if (recentMemory?.content) {
                memoryHint = recentMemory.content.slice(0, 100);
            }
        }

        // Pick a template, cycling based on time to avoid repetition
        const templateIdx =
            Math.floor(Date.now() / 86_400_000) % templates.length;
        const template = templates[templateIdx];

        // Personalize title with memory hint if available
        const title =
            memoryHint ?
                `${template.title} — ${memoryHint.slice(0, 60)}`
            :   template.title;

        const parsed = {
            title,
            description: template.description,
            steps: template.steps,
        };

        if (parsed.title) {
            // Route through proposal service for auto-approval evaluation
            const { createProposalAndMaybeAutoApprove } =
                await import('../../src/lib/ops/proposal-service');
            await createProposalAndMaybeAutoApprove({
                agent_id: entry.agent_id,
                title: parsed.title,
                description: parsed.description ?? '',
                proposed_steps: parsed.steps ?? [],
                source: 'initiative',
            });
        }

        await sql`
            UPDATE ops_initiative_queue
            SET status = 'completed',
                processed_at = NOW(),
                result = ${sql.json({ text: parsed.title, parsed })}::jsonb
            WHERE id = ${entry.id}
        `;
    } catch (err) {
        log.error('Initiative processing failed', {
            error: err,
            entryId: entry.id,
        });
        await sql`
            UPDATE ops_initiative_queue
            SET status = 'failed',
                processed_at = NOW(),
                result = ${sql.json({ error: (err as Error).message })}::jsonb
            WHERE id = ${entry.id}
        `;
    }

    return true;
}

/** Sweep agent sessions stuck in 'running' past their timeout */
async function sweepStaleAgentSessions(): Promise<boolean> {
    const stale = await sql<{ id: string; agent_id: string; source: string }[]>`
        UPDATE ops_agent_sessions
        SET status = 'timed_out',
            error = 'Swept by worker — session exceeded timeout while running',
            completed_at = NOW()
        WHERE status = 'running'
          AND started_at < NOW() - COALESCE(timeout_seconds, 600) * INTERVAL '1 second' - INTERVAL '5 minutes'
        RETURNING id, agent_id, source
    `;

    if (stale.length > 0) {
        log.warn('Swept stale agent sessions', {
            count: stale.length,
            sessions: stale.map(s => ({
                id: s.id,
                agent: s.agent_id,
                source: s.source,
            })),
        });
    }

    return stale.length > 0;
}

/** Check if all steps in a mission are done, finalize if so */
async function finalizeMissionIfComplete(missionId: string): Promise<void> {
    const [counts] = await sql<
        [{ total: number; succeeded: number; failed: number }]
    >`
        SELECT
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'succeeded')::int as succeeded,
            COUNT(*) FILTER (WHERE status = 'failed')::int as failed
        FROM ops_mission_steps
        WHERE mission_id = ${missionId}
    `;

    if (!counts || counts.total === 0) return;

    const allDone = counts.succeeded + counts.failed === counts.total;
    if (!allDone) return;

    const finalStatus = counts.failed > 0 ? 'failed' : 'succeeded';
    const failReason =
        counts.failed > 0 ?
            `${counts.failed} of ${counts.total} steps failed`
        :   null;

    await sql`
        UPDATE ops_missions
        SET status = ${finalStatus},
            failure_reason = ${failReason},
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${missionId}
        AND status IN ('running', 'approved')
    `;
}

// ─── DB readiness check ───

async function waitForDb(maxRetries = 30, intervalMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await sql`SELECT 1 FROM ops_roundtable_sessions LIMIT 0`;
            log.info('Database ready', { attempt });
            return;
        } catch {
            if (attempt === maxRetries) {
                throw new Error(
                    `Database not ready after ${maxRetries} attempts`,
                );
            }
            log.info('Waiting for database...', { attempt, maxRetries });
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }
}

// ─── Main poll loop ───

let running = true;

/** One-time: process content_review sessions that completed but were never processed */
async function catchUpStuckReviews(): Promise<void> {
    const stuck = await sql<
        { id: string; review_session_id: string; title: string }[]
    >`
        SELECT d.id, d.review_session_id, d.title
        FROM ops_content_drafts d
        JOIN ops_roundtable_sessions rs ON rs.id = d.review_session_id
        WHERE d.status = 'review'
          AND rs.status = 'completed'
    `;

    if (stuck.length === 0) return;

    log.info('Catching up stuck content reviews', { count: stuck.length });

    const { processReviewSession } =
        await import('../../src/lib/ops/content-pipeline');

    for (const draft of stuck) {
        try {
            await processReviewSession(draft.review_session_id);
            log.info('Stuck review processed', {
                draftId: draft.id,
                title: draft.title,
            });
        } catch (err) {
            log.error('Failed to process stuck review', {
                error: err,
                draftId: draft.id,
            });
        }
    }
}

/** One-time: finalize missions stuck in 'approved' with all steps completed */
async function catchUpOrphanedMissions(): Promise<void> {
    // Find missions in 'approved' where all steps are either succeeded or failed (none queued/running)
    const orphaned = await sql<
        {
            id: string;
            title: string;
            total: number;
            succeeded: number;
            failed: number;
        }[]
    >`
        SELECT m.id, m.title,
            COUNT(s.id)::int as total,
            COUNT(s.id) FILTER (WHERE s.status = 'succeeded')::int as succeeded,
            COUNT(s.id) FILTER (WHERE s.status = 'failed')::int as failed
        FROM ops_missions m
        LEFT JOIN ops_mission_steps s ON s.mission_id = m.id
        WHERE m.status = 'approved'
        GROUP BY m.id
        HAVING COUNT(s.id) > 0
           AND COUNT(s.id) = COUNT(s.id) FILTER (WHERE s.status IN ('succeeded', 'failed'))
    `;

    if (orphaned.length === 0) return;

    log.info('Catching up orphaned missions', { count: orphaned.length });

    for (const mission of orphaned) {
        const finalStatus = mission.failed > 0 ? 'failed' : 'succeeded';
        const failReason =
            mission.failed > 0 ?
                `${mission.failed} of ${mission.total} step(s) failed`
            :   null;
        await sql`
            UPDATE ops_missions
            SET status = ${finalStatus},
                failure_reason = ${failReason},
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = ${mission.id}
            AND status = 'approved'
        `;
        log.info('Orphaned mission finalized', {
            missionId: mission.id,
            title: mission.title,
            status: finalStatus,
        });
    }
}

async function pollLoop(): Promise<void> {
    await waitForDb();

    // Catch up on any stuck reviews from before the fix
    await catchUpStuckReviews();

    // Finalize any orphaned missions stuck in 'approved' with all steps done
    await catchUpOrphanedMissions();

    while (running) {
        try {
            // Roundtables first — user questions should not be starved by agent sessions
            await pollRoundtables();

            // Agent sessions — high priority, check every loop
            const hadSession = await pollAgentSessions();
            if (hadSession) continue; // Process back-to-back sessions

            // Mission steps — check every other loop
            await pollMissionSteps();

            // Finalize mission steps based on agent session completion
            await finalizeMissionSteps();

            // Sweep stale agent sessions stuck in 'running' past their timeout
            await sweepStaleAgentSessions();

            // Initiatives — check every other loop
            await pollInitiatives();
        } catch (err) {
            log.error('Poll loop error', { error: err });
        }

        // Wait 15 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 15_000));
    }
}

// ─── Graceful shutdown ───

function shutdown(signal: string): void {
    log.info(`Received ${signal}, shutting down...`);
    running = false;
    // Give in-flight work 30s to complete
    setTimeout(() => {
        log.warn('Forced shutdown after 30s timeout');
        process.exit(1);
    }, 30_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Entry point ───

log.info('Unified worker started', {
    workerId: WORKER_ID,
    database: !!process.env.DATABASE_URL,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    ollama:
        process.env.OLLAMA_ENABLED !== 'false' ?
            process.env.OLLAMA_BASE_URL || 'no-url'
        :   'disabled',
    braveSearch: !!process.env.BRAVE_API_KEY,
});

pollLoop()
    .then(() => {
        log.info('Worker stopped');
        process.exit(0);
    })
    .catch(err => {
        log.fatal('Fatal error', { error: err });
        process.exit(1);
    });
