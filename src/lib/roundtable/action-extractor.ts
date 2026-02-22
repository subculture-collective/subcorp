// Action Extractor — parses roundtable artifacts for actionable proposals
// After artifact synthesis, this extracts concrete action items and creates
// mission proposals so roundtable decisions become real work.

import { llmGenerate } from '@/lib/llm/client';
import { createProposalAndMaybeAutoApprove } from '@/lib/ops/proposal-service';
import type { StepKind, ProposedStep } from '@/lib/types';
import type { ConversationFormat } from '@/lib/types';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'action-extractor' });

/** Formats where action extraction is meaningful */
const ACTIONABLE_FORMATS = new Set([
    'planning',
    'strategy',
    'retro',
    'standup',
    'shipping',
    'triage',
    'brainstorm',
    'deep_dive',
    'risk_review',
    'debate',
]);

/**
 * Formats representing already-deliberated decisions — actions extracted from these
 * should carry a hint for the proposal system to auto-approve more readily.
 */
export const DELIBERATED_FORMATS = new Set<ConversationFormat>([
    'planning',
    'shipping',
    'strategy',
]);

const VALID_STEP_KINDS = new Set<StepKind>([
    'research_topic',
    'scan_signals',
    'draft_essay',
    'draft_thread',
    'patch_code',
    'audit_system',
    'critique_content',
    'distill_insight',
    'document_lesson',
    'consolidate_memory',
    'content_revision',
    'convene_roundtable',
    'draft_product_spec',
]);

/**
 * Extract action items from a roundtable artifact and create mission proposals.
 * Returns the number of proposals created.
 */
export async function extractActionsFromArtifact(
    sessionId: string,
    format: string,
    artifactText: string,
    topic: string,
): Promise<number> {
    if (!ACTIONABLE_FORMATS.has(format)) return 0;
    if (!artifactText || artifactText.length < 50) return 0;

    try {
        const result = await llmGenerate({
            messages: [
                {
                    role: 'system',
                    content:
                        'You extract concrete, executable action items from meeting artifacts. ' +
                        'Return ONLY valid JSON — an array of mission objects. ' +
                        'Each mission: { "title": "<imperative action>", "description": "<why this matters>", "owner": "<agent_id>", "steps": [{ "kind": "<step_kind>", "payload": {} }] }\n\n' +
                        'Valid step kinds: research_topic, scan_signals, draft_essay, draft_thread, patch_code, audit_system, critique_content, distill_insight, document_lesson, consolidate_memory, content_revision, convene_roundtable, draft_product_spec\n' +
                        'Valid agent IDs: praxis, primus, chora, subrosa, thaum, mux\n\n' +
                        'Rules:\n' +
                        '- Only extract items that are CONCRETE and ACTIONABLE (not "discuss X" or "think about Y")\n' +
                        '- Each mission should produce a tangible artifact (code, document, analysis)\n' +
                        '- Use patch_code for any code/build tasks\n' +
                        '- Use research_topic for investigation tasks\n' +
                        '- Use draft_essay for writing deliverables\n' +
                        '- If no concrete actions exist, return an empty array []\n' +
                        '- Maximum 3 missions per artifact',
                },
                {
                    role: 'user',
                    content: `Extract actionable missions from this ${format} roundtable artifact.\n\nTopic: ${topic}\n\n${artifactText}`,
                },
            ],
            temperature: 0.3,
            maxTokens: 1000,
            trackingContext: {
                agentId: 'system',
                context: 'action-extraction',
            },
        });

        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            log.info('No actions extracted from artifact', {
                sessionId,
                format,
            });
            return 0;
        }

        const missions = JSON.parse(jsonMatch[0]) as Array<{
            title: string;
            description?: string;
            owner?: string;
            steps: Array<{ kind: string; payload?: Record<string, unknown> }>;
        }>;

        if (!Array.isArray(missions) || missions.length === 0) return 0;

        let created = 0;
        for (const mission of missions.slice(0, 3)) {
            if (!mission.title || !mission.steps?.length) continue;

            // Validate step kinds
            const validSteps: ProposedStep[] = mission.steps
                .filter(s => VALID_STEP_KINDS.has(s.kind as StepKind))
                .map(s => ({
                    kind: s.kind as StepKind,
                    payload: s.payload,
                }));

            if (validSteps.length === 0) continue;

            const owner = mission.owner ?? 'praxis';
            const proposalResult = await createProposalAndMaybeAutoApprove({
                agent_id: owner,
                title: mission.title,
                description: mission.description,
                proposed_steps: validSteps,
                source: 'conversation',
                source_trace_id: sessionId,
            });

            if (proposalResult.success) {
                created++;
                log.info('Action extracted from roundtable artifact', {
                    sessionId,
                    format,
                    proposalId: proposalResult.proposalId,
                    missionId: proposalResult.missionId,
                    title: mission.title,
                    autoApproved: !!proposalResult.missionId,
                });
            }
        }

        return created;
    } catch (err) {
        log.error('Action extraction failed', {
            error: err,
            sessionId,
            format,
        });
        return 0;
    }
}
