// Meeting Debrief — structured post-conversation summary with action items
// Generates a debrief after every roundtable: summary, decisions, action items, open questions.
// Action items are automatically converted to mission proposals.

import { sql, jsonb } from '@/lib/db';
import { llmGenerate } from '@/lib/llm/client';
import { createProposalAndMaybeAutoApprove } from '@/lib/ops/proposal-service';
import { logger } from '@/lib/logger';
import type { RoundtableSession, ConversationTurnEntry, ProposedStep } from '../types';

const log = logger.child({ module: 'debrief' });

export interface DebriefActionItem {
    task: string;
    owner: string;
    priority: 'high' | 'medium' | 'low';
    stepKind: string;
}

export interface Debrief {
    summary: string;
    decisions: string[];
    actionItems: DebriefActionItem[];
    openQuestions: string[];
    generatedAt: string;
}

/**
 * Generate a structured debrief from a completed roundtable conversation.
 * Extracts summary, decisions, action items (with owners), and open questions.
 * Action items are automatically submitted as mission proposals.
 */
export async function generateDebrief(
    session: RoundtableSession,
    history: ConversationTurnEntry[],
): Promise<Debrief | null> {
    if (history.length < 3) return null;

    const transcript = history
        .map(t => `[${t.speaker}]: ${t.dialogue}`)
        .join('\n\n');

    const prompt = `You just observed a ${session.format} conversation.

Topic: ${session.topic}
Participants: ${session.participants.join(', ')}
Turns: ${history.length}

═══ TRANSCRIPT ═══
${transcript}
═══ END ═══

Generate a structured meeting debrief. Respond with ONLY valid JSON (no markdown fencing):
{
    "summary": "2-3 sentence summary of what was discussed and the overall direction",
    "decisions": ["Decision 1", "Decision 2"],
    "actionItems": [
        {
            "task": "Concrete task description in imperative form",
            "owner": "agent_id (one of: chora, subrosa, thaum, praxis, mux, primus)",
            "priority": "high|medium|low",
            "stepKind": "one of: research_topic, scan_signals, draft_essay, draft_thread, draft_product_spec, patch_code, audit_system, convene_roundtable, document_lesson, distill_insight"
        }
    ],
    "openQuestions": ["Unresolved question 1", "Question 2"]
}

Rules:
- Only include decisions that were explicitly agreed upon
- Action items must be concrete and assignable — not vague ("improve things")
- If no decisions were made, return an empty array
- If no action items emerged, return an empty array
- Match owners to who volunteered or was assigned, or pick the best-suited agent
- Keep summary concise — this is a debrief, not a report`;

    try {
        const result = await llmGenerate({
            messages: [
                { role: 'system', content: 'You are a meeting secretary. Output only valid JSON.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            maxTokens: 3000,
            trackingContext: { context: 'debrief' },
        });

        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            log.warn('No JSON in debrief result', { sessionId: session.id });
            return null;
        }

        let parsed: Debrief;
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch {
            log.warn('Invalid JSON in debrief', { sessionId: session.id });
            return null;
        }

        // Ensure arrays
        parsed.decisions = parsed.decisions ?? [];
        parsed.actionItems = parsed.actionItems ?? [];
        parsed.openQuestions = parsed.openQuestions ?? [];
        parsed.generatedAt = new Date().toISOString();

        // Store debrief on the session
        await sql`
            UPDATE ops_roundtable_sessions
            SET metadata = COALESCE(metadata, '{}'::jsonb) || ${jsonb({ debrief: parsed })}
            WHERE id = ${session.id}
        `;

        // Convert action items to mission proposals
        let proposalCount = 0;
        for (const item of parsed.actionItems.slice(0, 5)) {
            try {
                const steps: ProposedStep[] = [{
                    kind: (item.stepKind || 'document_lesson') as ProposedStep['kind'],
                    assigned_agent: item.owner,
                    payload: { description: item.task, priority: item.priority },
                }];

                const result = await createProposalAndMaybeAutoApprove({
                    agent_id: item.owner,
                    title: item.task,
                    description: `From debrief: ${session.format} on "${session.topic}"`,
                    proposed_steps: steps,
                    source: 'conversation',
                    source_trace_id: session.id,
                });

                if (result.success) proposalCount++;
            } catch (err) {
                log.error('Failed to create proposal from debrief action item', {
                    error: err, task: item.task, sessionId: session.id,
                });
            }
        }

        log.info('Debrief generated', {
            sessionId: session.id,
            format: session.format,
            decisions: parsed.decisions.length,
            actionItems: parsed.actionItems.length,
            openQuestions: parsed.openQuestions.length,
            proposalsCreated: proposalCount,
        });

        return parsed;
    } catch (err) {
        log.error('Debrief generation failed', { error: err, sessionId: session.id });
        return null;
    }
}

/**
 * Format a debrief as markdown for Discord/feed posting.
 */
export function formatDebriefMarkdown(debrief: Debrief, topic: string): string {
    let md = `📋 **Meeting Debrief**\n`;
    md += `> ${topic}\n\n`;

    md += `**Summary:** ${debrief.summary}\n\n`;

    if (debrief.decisions.length > 0) {
        md += `**Decisions:**\n`;
        debrief.decisions.forEach(d => { md += `✅ ${d}\n`; });
        md += '\n';
    }

    if (debrief.actionItems.length > 0) {
        md += `**Action Items:**\n`;
        debrief.actionItems.forEach(a => {
            const priority = a.priority === 'high' ? '🔴' : a.priority === 'medium' ? '🟡' : '🟢';
            md += `${priority} **${a.owner}**: ${a.task}\n`;
        });
        md += '\n';
    }

    if (debrief.openQuestions.length > 0) {
        md += `**Open Questions:**\n`;
        debrief.openQuestions.forEach(q => { md += `❓ ${q}\n`; });
    }

    return md;
}
