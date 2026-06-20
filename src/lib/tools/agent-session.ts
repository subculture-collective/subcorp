// Agent Session Executor — tool-augmented LLM loop
// Runs an agent session: loads voice + tools, calls LLM in a loop,
// executes tool calls, feeds results back until done or timeout.

import { sql, jsonb } from '@/lib/db';
import { llmGenerateWithTools, extractFromXml, normalizeDsml } from '@/lib/llm/client';
import { getVoice } from '@/lib/roundtable/voices';
import { getAgentTools, getDroidTools, getAgentToolNames, getAgentWritePaths } from './registry';
import { execInToolbox } from './executor';
import { emitEvent } from '@/lib/ops/events';
import { queryRelevantMemories } from '@/lib/ops/memory';
import { getScratchpad } from '@/lib/ops/scratchpad';
import { buildBriefing } from '@/lib/ops/situational-briefing';
import { loadPrimeDirective } from '@/lib/ops/prime-directive';
import { randomUUID } from 'node:crypto';
import { logger } from '@/lib/logger';
import type { AgentId, LLMMessage, ToolCallRecord, ToolDefinition } from '../types';
import type { AgentSession } from './types';

const log = logger.child({ module: 'agent-session' });

/** Reserve this much time before timeout for the final DB write so sessions finish cleanly. */
const SESSION_SOFT_DEADLINE_BUFFER_MS = 90_000;

/** Max length for individual tool result strings in the feedback message. */
const TOOL_RESULT_MAX_LENGTH = 5000;

/** Break early after this many consecutive LLM rounds with no text output. */
const MAX_CONSECUTIVE_EMPTY_ROUNDS = 3;

/** Max length for memory content previews in system prompt. */
const MEMORY_PREVIEW_LENGTH = 200;

/** Max length for recent session summary previews in system prompt. */
const SESSION_SUMMARY_PREVIEW_LENGTH = 300;

function readPositiveIntEnv(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/** Output budget for each agent LLM call. Lower defaults reduce upstream ctx/KV pressure. */
const AGENT_SESSION_MAX_TOKENS = readPositiveIntEnv('AGENT_SESSION_MAX_TOKENS', 6000);

/** Tool-call budget for a single LLM provider loop. */
const AGENT_SESSION_MAX_TOOL_ROUNDS = readPositiveIntEnv('AGENT_SESSION_MAX_TOOL_ROUNDS', 6);

/** Strip XML function-call tags and other LLM artifacts from text */
function sanitizeSummary(text: string): string {
    return (
        normalizeDsml(text)
            // Remove XML-style tags (e.g. <function_calls>, <invoke>, <parameter>)
            .replace(/<\/?[a-z_][a-z0-9_-]*(?:\s[^>]*)?\s*>/gi, '')
            // Collapse runs of whitespace
            .replace(/\s{2,}/g, ' ')
            .trim()
    );
}

/** Extract a short preview from text — first N chars, cut at sentence boundary */
function truncateToFirstSentences(text: string, maxLen: number): string {
    const clean = text
        .replace(/<\/?[a-z_][a-z0-9_-]*(?:\s[^>]*)?\s*>/gi, '')
        .replace(/^#+\s+.+$/gm, '') // strip markdown headers
        .replace(/\n{2,}/g, '\n')
        .trim();
    if (clean.length <= maxLen) return clean;
    // Cut at last sentence-ending punctuation before maxLen
    // Handles: "word. ", "word.\n", "word.**", "word.)\n", etc.
    const truncated = clean.slice(0, maxLen);
    const sentenceEnd = truncated.search(/[.!?][*_)\]]*[\s\n](?=[^\s])[^]*$/);
    if (sentenceEnd > maxLen * 0.3) {
        // Include the punctuation and any closing markdown
        const endMatch = truncated.slice(sentenceEnd).match(/^[.!?][*_)\]]*/);
        return truncated.slice(0, sentenceEnd + (endMatch?.[0].length ?? 1));
    }
    // Fallback: cut at last newline (paragraph break) for cleaner truncation
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > maxLen * 0.5) return truncated.slice(0, lastNewline);
    return truncated + '...';
}

const HARD_BLOCKER_SUMMARY_PATTERNS: RegExp[] = [
    /\bcritical blocker\b/i,
    /\bdata dependency blocked\b/i,
    // Negative lookbehind guards against "not blocked by", "never blocked by", "wasn't blocked by", etc.
    /(?<!(?:not|never|no longer|isn't|aren't|wasn't|weren't) )\bblocked by\b/i,
    /\bmission is, by definition, stalled\b/i,
    /\bcannot proceed\b/i,
    /\bcannot continue\b/i,
    /\bcannot be completed\b/i,
    /\bno further (procedural )?steps? (i )?can take\b/i,
    /\bhands are tied\b/i,
    // Negative lookbehind guards against "not stalled by", "never stalled by", etc.
    /(?<!(?:not|never) )\bstalled by\b/i,
];

const SOFT_BLOCKER_SUMMARY_PATTERNS: RegExp[] = [
    /\bawait(?:ing)? (?:instruction|input|external|data|provisioning)\b/i,
    // Negative lookbehind guards against "not waiting for", "never waiting for", etc.
    /(?<!(?:not|never) )\bwaiting for\b/i,
    /\bpaused pending\b/i,
];

const PROGRESS_SUMMARY_PATTERNS: RegExp[] = [
    /\bcompleted\b/i,
    /\bfinished\b/i,
    /\bgenerated\b/i,
    /\bproduced\b/i,
    /\bcreated\b/i,
    /\bdrafted\b/i,
    /\bwrote\b/i,
    /\bupdated\b/i,
    /\bpublished\b/i,
    /\bposted\b/i,
    /\bsent\b/i,
    /\bdelivered\b/i,
    /\bfetched\b/i,
    /\bprocessed\b/i,
    /\bqueued\b/i,
    /\bsaved\b/i,
    /\bsucceeded\b/i,
    /\bsuccessfully\b/i,
];

const TOOL_ERROR_PATTERNS: RegExp[] = [
    /no such file or directory/i,
    /permission denied/i,
    /access denied/i,
    /file read failed/i,
    /file write failed/i,
    /timed out/i,
    /tool\s+"?.+"?\s+does not exist/i,
    /invalid tool arguments/i,
];

type ToolRequirement = {
    /** Every listed tool must have at least one successful call. */
    allOf?: string[];
    /** At least one listed tool must have a successful call. */
    anyOf?: string[];
};

const STEP_TOOL_REQUIREMENTS: Record<string, ToolRequirement> = {
    // Work that must create or modify files.
    patch_code: { allOf: ['file_write'] },
    self_evolution: { allOf: ['bash', 'file_write'] },
    draft_essay: { allOf: ['file_write'] },
    draft_thread: { allOf: ['file_write'] },
    draft_product_spec: { allOf: ['file_write'] },
    critique_content: { allOf: ['file_write'] },
    distill_insight: { allOf: ['file_write'] },
    document_lesson: { allOf: ['file_write'] },
    consolidate_memory: { allOf: ['file_write'] },
    content_revision: { allOf: ['file_write'] },
    update_directive: { allOf: ['file_write'] },
    analyze_discourse: { allOf: ['file_write'] },
    classify_pattern: { allOf: ['file_write'] },
    trace_incentive: { allOf: ['file_write'] },
    identify_assumption: { allOf: ['file_write'] },
    refine_narrative: { allOf: ['file_write'] },
    prepare_statement: { allOf: ['file_write'] },
    write_issue: { allOf: ['file_write'] },
    review_policy: { allOf: ['file_write'] },
    map_dependency: { allOf: ['file_write'] },
    log_event: { allOf: ['file_write'] },
    tag_memory: { allOf: ['file_write'] },
    escalate_risk: { allOf: ['file_write'] },

    // Work that must consult external/runtime state.
    research_topic: { allOf: ['web_search'] },
    scan_signals: { allOf: ['web_search'] },
    audit_system: { allOf: ['bash', 'file_write'] },
    github_issue: { allOf: ['bash'] },
    github_pr: { allOf: ['bash'] },
    create_pull_request: { allOf: ['bash'] },
    explore_repo: { allOf: ['bash'] },
    publish_blog: { anyOf: ['bash', 'file_write'] },
    notify_human: { allOf: ['bash'] },
};

const STEP_KINDS_REQUIRING_GROUNDED_ARTIFACTS = new Set([
    'document_lesson',
    'draft_product_spec',
    'distill_insight',
    'draft_essay',
    'draft_thread',
    'critique_content',
    'patch_code',
    'content_revision',
    'self_evolution',
    'log_event',
]);

function toolErrorText(result: unknown): string {
    if (typeof result === 'string') return result;
    if (!result || typeof result !== 'object') return '';

    const rec = result as Record<string, unknown>;
    const err = typeof rec.error === 'string' ? rec.error : '';
    const stderr = typeof rec.stderr === 'string' ? rec.stderr : '';
    return [err, stderr].filter(Boolean).join('\n');
}

function isSuccessfulToolCall(toolCall: ToolCallRecord): boolean {
    if (toolCall.result === undefined) return false;

    const text = toolErrorText(toolCall.result);
    if (text.length > 0) {
        if (/not available/i.test(text)) return false;
        if (TOOL_ERROR_PATTERNS.some(p => p.test(text))) return false;
    }

    if (typeof toolCall.result === 'object' && toolCall.result !== null) {
        const exitCode = (toolCall.result as Record<string, unknown>).exitCode;
        if (typeof exitCode === 'number' && exitCode !== 0) return false;

        return !(
            typeof (toolCall.result as Record<string, unknown>).error === 'string'
        );
    }

    return true;
}

function mergeToolRequirements(
    left: ToolRequirement,
    right: ToolRequirement,
): ToolRequirement {
    return {
        allOf: [...new Set([...(left.allOf ?? []), ...(right.allOf ?? [])])],
        anyOf: [...new Set([...(left.anyOf ?? []), ...(right.anyOf ?? [])])],
    };
}

function stepKindFromPrompt(prompt: string): string | null {
    return prompt.match(/^Step:\s*([^\n]+)/m)?.[1]?.trim() ?? null;
}

function inferPromptToolRequirements(prompt: string): ToolRequirement {
    let requirement: ToolRequirement = {};
    const text = prompt.toLowerCase();

    if (
        /\bfile_write\b|using file_write|write (?:the |a |your )?[\s\S]*\bto\b/.test(
            text,
        )
    ) {
        requirement = mergeToolRequirements(requirement, {
            allOf: ['file_write'],
        });
    }
    if (/\bweb_search\b|search the web|web search/.test(text)) {
        requirement = mergeToolRequirements(requirement, { allOf: ['web_search'] });
    }
    if (requiresExplicitTool(prompt, 'web_fetch')) {
        requirement = mergeToolRequirements(requirement, { allOf: ['web_fetch'] });
    }
    if (/\bmemory_search\b/.test(text)) {
        requirement = mergeToolRequirements(requirement, { allOf: ['memory_search'] });
    }
    if (/\bsend_to_agent\b/.test(text)) {
        requirement = mergeToolRequirements(requirement, { allOf: ['send_to_agent'] });
    }
    if (requiresExplicitTool(prompt, 'memory_write') && !mentionsOptionalTool(prompt, 'memory_write')) {
        requirement = mergeToolRequirements(requirement, { allOf: ['memory_write'] });
    }
    if (
        /\bbash\b|run system checks|git\s+(?:status|diff|log|push|clone|commit)/.test(
            text,
        )
    ) {
        requirement = mergeToolRequirements(requirement, { allOf: ['bash'] });
    }

    return requirement;
}

function requiresExplicitTool(prompt: string, toolName: string): boolean {
    const escapedTool = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const explicitToolPattern = new RegExp(
        `(?:must|need to|required to|completion contract:[^\\n]*must|you must|call|use)\\s+[^\\n.]{0,80}\\b${escapedTool}\\b`,
        'i',
    );
    return explicitToolPattern.test(prompt);
}

function mentionsOptionalTool(prompt: string, toolName: string): boolean {
    const escapedTool = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:optionally|optional|if useful|if helpful)\\s+[^\\n.]{0,80}\\b${escapedTool}\\b`, 'i').test(prompt);
}

function requirementsForSession(session: AgentSession): ToolRequirement {
    if (!['mission', 'cron', 'droid'].includes(session.source)) return {};

    const inferred = inferPromptToolRequirements(session.prompt);
    if (session.source !== 'mission') return filterUnavailableToolRequirements(session, inferred);

    const stepKind = stepKindFromPrompt(session.prompt);
    if (!stepKind) return filterUnavailableToolRequirements(session, inferred);

    return filterUnavailableToolRequirements(session, mergeToolRequirements(
        inferred,
        STEP_TOOL_REQUIREMENTS[stepKind] ?? {},
    ));
}

function availableToolNamesForSession(session: AgentSession): Set<string> {
    if (session.agent_id.startsWith('droid-')) {
        return new Set(getDroidTools(session.agent_id).map(t => t.name));
    }
    return new Set(getAgentToolNames(session.agent_id as AgentId));
}

function filterUnavailableToolRequirements(
    session: AgentSession,
    requirement: ToolRequirement,
): ToolRequirement {
    const available = availableToolNamesForSession(session);
    return {
        allOf: (requirement.allOf ?? []).filter(name => available.has(name)),
        anyOf: (requirement.anyOf ?? []).filter(name => available.has(name)),
    };
}

export function detectMissingRequiredToolEvidence(
    session: AgentSession,
    toolCalls: ToolCallRecord[],
): { blocked: boolean; reason: string; evidence: string[] } {
    const requirement = requirementsForSession(session);
    const requiredAll = requirement.allOf ?? [];
    const requiredAny = requirement.anyOf ?? [];

    if (requiredAll.length === 0 && requiredAny.length === 0) {
        return { blocked: false, reason: '', evidence: [] };
    }

    const successfulToolNames = new Set(
        toolCalls.filter(isSuccessfulToolCall).map(tc => tc.name),
    );
    const missingAll = requiredAll.filter(name => !successfulToolNames.has(name));
    const missingAny =
        requiredAny.length > 0 &&
        !requiredAny.some(name => successfulToolNames.has(name)) ?
            requiredAny
        :   [];

    const stepKind = stepKindFromPrompt(session.prompt);
    const availableTools = availableToolNamesForSession(session);
    const canSatisfyAuditEvidence = availableTools.has('bash') && availableTools.has('file_write');
    const auditEvidence = canSatisfyAuditEvidence ?
        detectAuditEvidenceIssues(stepKind, toolCalls)
    :   { blocked: false, evidence: [] };
    const groundingEvidence = detectArtifactGroundingIssues(stepKind, toolCalls);

    if (
        missingAll.length === 0 &&
        missingAny.length === 0 &&
        !auditEvidence.blocked &&
        !groundingEvidence.blocked
    ) {
        return { blocked: false, reason: '', evidence: [] };
    }

    const evidence = [
        `session source=${session.source}${stepKind ? ` step=${stepKind}` : ''}`,
        `successful tools: ${[...successfulToolNames].join(', ') || '(none)'}`,
    ];
    if (missingAll.length > 0) {
        evidence.push(`missing required tool(s): ${missingAll.join(', ')}`);
    }
    if (missingAny.length > 0) {
        evidence.push(
            `missing at least one required tool from: ${missingAny.join(', ')}`,
        );
    }
    evidence.push(...auditEvidence.evidence);
    evidence.push(...groundingEvidence.evidence);

    return {
        blocked: true,
        reason:
            auditEvidence.blocked ? 'audit evidence missing'
            : groundingEvidence.blocked && groundingEvidence.evidence.some(item => item.includes('artifact grounding invalid')) ? 'artifact grounding invalid'
            : groundingEvidence.blocked ? 'artifact grounding missing'
            : 'Required tool evidence missing',
        evidence,
    };
}

function detectEmptySessionOutcome(
    session: AgentSession,
    text: string,
    toolCalls: ToolCallRecord[],
): { blocked: boolean; reason: string; evidence: string[] } {
    if (!['mission', 'cron', 'droid'].includes(session.source)) {
        return { blocked: false, reason: '', evidence: [] };
    }

    const hasText = text.trim().length > 0;
    const successfulToolNames = toolCalls.filter(isSuccessfulToolCall).map(tc => tc.name);
    if (hasText || successfulToolNames.length > 0) {
        return { blocked: false, reason: '', evidence: [] };
    }

    return {
        blocked: true,
        reason: 'empty session output',
        evidence: [
            `session source=${session.source}${stepKindFromPrompt(session.prompt) ? ` step=${stepKindFromPrompt(session.prompt)}` : ''}`,
            'empty session output: no final text and no successful tool calls',
        ],
    };
}

function normalizeWorkspaceRelativePath(path: string): string {
    return path.startsWith('/workspace/') ? path.slice('/workspace/'.length) : path.replace(/^\/+/, '');
}

function droidWritePath(session: AgentSession, path: string): boolean {
    const relativePath = normalizeWorkspaceRelativePath(path);
    return relativePath === `droids/${session.agent_id}` || relativePath.startsWith(`droids/${session.agent_id}/`);
}

function isDroidFinalArtifactPath(session: AgentSession, path: string): boolean {
    const relativePath = normalizeWorkspaceRelativePath(path);
    const expectedOutput =
        typeof session.result?.output_path === 'string' ? normalizeWorkspaceRelativePath(session.result.output_path) : '';
    if (expectedOutput && relativePath === expectedOutput) return true;
    if (!droidWritePath(session, relativePath)) return false;

    const basename = relativePath.split('/').pop() ?? '';
    return /(?:^|[-_])(output|report|result|results|proof|review|summary|artifact)(?:[-_.]|$)/i.test(basename) || /\.md$/i.test(basename);
}

function isPointerOnlyDroidArtifact(content: string): boolean {
    const normalized = content.trim();
    if (normalized.length === 0) return true;
    if (normalized.length < 120) return true;
    if (/\b(?:todo|placeholder|stub|draft pending|will write|to be completed)\b/i.test(normalized)) return true;
    if (/^(?:see|check|refer to|look at)\s+(?:the\s+)?(?:file|path|output|report)\b/i.test(normalized)) return true;
    if (/^#?\s*(?:output|report|summary|proof)\s*\n+\s*(?:see|todo|placeholder|pending)\b/i.test(normalized)) return true;
    return false;
}

function detectDroidPlaceholderArtifact(
    session: AgentSession,
    toolCalls: ToolCallRecord[],
): { blocked: boolean; reason: string; evidence: string[] } {
    if (session.source !== 'droid' && !session.agent_id.startsWith('droid-')) {
        return { blocked: false, reason: '', evidence: [] };
    }

    const finalArtifactWrites = toolCalls.filter(tc => {
        if (tc.name !== 'file_write' || !isSuccessfulToolCall(tc)) return false;
        const args = tc.arguments as Record<string, unknown>;
        const path = typeof args.path === 'string' ? args.path : '';
        const content = typeof args.content === 'string' ? args.content : '';
        return isDroidFinalArtifactPath(session, path) && content.trim().length > 0;
    });

    if (finalArtifactWrites.length === 0) {
        return { blocked: false, reason: '', evidence: [] };
    }

    const substantiveWrites = finalArtifactWrites.filter(tc => {
        const args = tc.arguments as Record<string, unknown>;
        const content = typeof args.content === 'string' ? args.content : '';
        return content.trim().length >= 120 && !isPointerOnlyDroidArtifact(content);
    });

    if (substantiveWrites.length > 0) {
        return { blocked: false, reason: '', evidence: [] };
    }

    const paths = finalArtifactWrites
        .map(tc => String((tc.arguments as Record<string, unknown>).path ?? 'unknown'))
        .join(', ');
    return {
        blocked: true,
        reason: 'droid placeholder artifact',
        evidence: [
            `droid placeholder artifact: ${finalArtifactWrites.length} final/report-like droid write(s) were tiny, TODO/stub, or pointer-only`,
            `droid final artifact path(s): ${paths}`,
        ],
    };
}

function missingRequiredToolNamesForSession(
    session: AgentSession,
    toolCalls: ToolCallRecord[],
): string[] {
    const requirement = requirementsForSession(session);
    const requiredAll = requirement.allOf ?? [];
    const requiredAny = requirement.anyOf ?? [];

    const successfulToolNames = new Set(
        toolCalls.filter(isSuccessfulToolCall).map(tc => tc.name),
    );
    const missing = requiredAll.filter(name => !successfulToolNames.has(name));
    if (
        requiredAny.length > 0 &&
        !requiredAny.some(name => successfulToolNames.has(name))
    ) {
        missing.push(`one of: ${requiredAny.join(', ')}`);
    }
    return missing;
}

function detectArtifactGroundingIssues(
    stepKind: string | null,
    toolCalls: ToolCallRecord[],
): { blocked: boolean; evidence: string[] } {
    if (!stepKind || !STEP_KINDS_REQUIRING_GROUNDED_ARTIFACTS.has(stepKind)) {
        return { blocked: false, evidence: [] };
    }

    const artifactWritesByPath = new Map<string, ToolCallRecord>();
    for (const tc of toolCalls) {
        if (tc.name !== 'file_write' || !isSuccessfulToolCall(tc)) continue;
        const args = tc.arguments as Record<string, unknown>;
        const path = typeof args.path === 'string' ? args.path : '';
        const content = typeof args.content === 'string' ? args.content : '';
        const normalizedPath = normalizeWorkspaceRelativePath(path);
        if (isArtifactSummaryPath(normalizedPath) && content.trim().length > 0) {
            artifactWritesByPath.set(normalizedPath, tc);
        }
    }
    const artifactWrites = [...artifactWritesByPath.values()];
    const groundedWrites = artifactWrites.filter(tc => {
        const args = tc.arguments as Record<string, unknown>;
        const content = typeof args.content === 'string' ? args.content : '';
        return containsGroundingSection(content) && !containsWeakGroundingSection(content) && invalidGroundingIssues(stepKind, content).length === 0;
    });
    const weakGroundingWrites = artifactWrites.filter(tc => {
        const args = tc.arguments as Record<string, unknown>;
        const content = typeof args.content === 'string' ? args.content : '';
        return containsGroundingSection(content) && containsWeakGroundingSection(content);
    });
    const invalidGrounding = artifactWrites.flatMap(tc => {
        const args = tc.arguments as Record<string, unknown>;
        const content = typeof args.content === 'string' ? args.content : '';
        const path = typeof args.path === 'string' ? args.path : 'unknown';
        return invalidGroundingIssues(stepKind, content).map(issue => `${path}: ${issue}`);
    });

    if (artifactWrites.length === 0 || (groundedWrites.length > 0 && weakGroundingWrites.length === 0 && invalidGrounding.length === 0)) {
        return { blocked: false, evidence: [] };
    }

    if (invalidGrounding.length > 0) {
        return {
            blocked: true,
            evidence: [
                `artifact grounding invalid: ${invalidGrounding.length} invalid grounding issue(s) found`,
                ...invalidGrounding.slice(0, 5),
            ],
        };
    }

    if (weakGroundingWrites.length > 0) {
        return {
            blocked: true,
            evidence: [
                `artifact grounding weak: ${weakGroundingWrites.length} artifact write(s) used a Grounding section with no concrete evidence`,
                'Grounding sections must cite concrete files, commands, DB rows, URLs, source artifacts, or explicit assumptions; Source Artifact: None / Commands Used: None is not sufficient',
            ],
        };
    }

    return {
        blocked: true,
        evidence: [
            `artifact grounding missing: ${artifactWrites.length} artifact write(s) lacked a Grounding section`,
            'grounded artifact steps must include a Grounding section with exact files, commands, DB rows, URLs, or source artifacts',
        ],
    };
}

function isArtifactSummaryPath(path: string): boolean {
    return /(?:^|\/)(?:output\/(?:reports|reviews|digests)|agents\/[^/]+\/(?:notes|specs)|\.gitea\/pull-requests)\//.test(path);
}

function containsGroundingSection(text: string): boolean {
    return /^#{1,4}\s+Grounding\b|^\*\*Grounding:?\*\*|^Grounding\s*:/im.test(text);
}

function groundingSectionText(text: string): string {
    const marker = text.match(/^#{1,4}\s+Grounding\b|^\*\*Grounding:?\*\*|^Grounding\s*:/im);
    if (!marker || marker.index === undefined) return '';

    const tail = text.slice(marker.index);
    const afterMarker = tail.slice(marker[0].length);
    const nextHeading = afterMarker.search(/^#{1,4}\s+\S/im);
    return nextHeading >= 0 ? tail.slice(0, marker[0].length + nextHeading) : tail;
}

function containsWeakGroundingSection(text: string): boolean {
    const section = groundingSectionText(text);
    if (!section) return false;

    const weakMarkers = section.match(/(?:source artifacts?|commands? used|files?|urls?|db rows?)\s*:\s*(?:none|n\/a|not applicable|unknown)\b/gi) ?? [];
    if (weakMarkers.length === 0) return false;

    const concreteEvidence = /(?:\/workspace\/|\boutput\/|\bagents\/|https?:\/\/|\bfile_read\b|\bweb_fetch\b|\bweb_search\b|\bbash\b|\bSELECT\b|\bDB row\b|\bassumption\b)/i.test(section);
    return weakMarkers.length >= 2 && !concreteEvidence;
}

function invalidGroundingIssues(stepKind: string | null, text: string): string[] {
    const issues: string[] = [];
    const section = groundingSectionText(text);
    if (!section) return issues;

    if (containsPlaceholderEvidenceUrl(section)) {
        issues.push('placeholder URL cited as grounding evidence');
    }
    if (containsMissingSourceMarker(section)) {
        issues.push('cited source artifact is marked missing, unavailable, or assumed');
    }
    if (stepKind === 'draft_product_spec' && containsUnverifiedProductSpecMetric(text)) {
        issues.push('product spec success metric is framed as verified/completed outcome instead of target/proposed metric');
    }

    return issues;
}

function containsPlaceholderEvidenceUrl(section: string): boolean {
    return /https?:\/\/(?:www\.)?(?:example\.com|example\.org|example\.net)(?:[/:?#]|\b)/i.test(section);
}

function containsMissingSourceMarker(section: string): boolean {
    const lines = section.split('\n');
    return lines.some(line => {
        const citesSourcePath = /(?:\/workspace\/|\bagents\/|\boutput\/|\bprojects\/)[^\s,)]+/i.test(line);
        const markedMissing = /\b(?:file not found|not found|unavailable|inaccessible|could not read|assumption made|assumed missing)\b/i.test(line);
        return citesSourcePath && markedMissing;
    });
}

function markdownSectionText(text: string, headingPattern: RegExp): string {
    const heading = text.match(headingPattern);
    if (!heading || heading.index === undefined) return '';
    const tail = text.slice(heading.index);
    const afterHeading = tail.slice(heading[0].length);
    const nextHeading = afterHeading.search(/^#{1,4}\s+\S/im);
    return nextHeading >= 0 ? tail.slice(0, heading[0].length + nextHeading) : tail;
}

function containsUnverifiedProductSpecMetric(text: string): boolean {
    const section = markdownSectionText(text, /^#{1,4}\s+Success Metrics\b/im);
    if (!section) return false;

    return section.split('\n').some(line => {
        const trimmed = line.trim();
        if (!/^[-*]\s+|^\d+\.\s+/.test(trimmed)) return false;
        if (/\b(?:target|proposed|goal|aim|planned|candidate|success metric|should|will|by \d{4}-\d{2}-\d{2})\b/i.test(trimmed)) return false;
        return /\b(?:verified|observed|achieved|completed|implemented|approved|documented|resolved|delivered)\b/i.test(trimmed);
    });
}

function manifestPathType(relativePath: string): string {
    if (relativePath.startsWith('output/briefings/')) return 'briefing';
    if (relativePath.startsWith('output/reports/')) return 'report';
    if (relativePath.startsWith('output/reviews/')) return 'review';
    if (relativePath.startsWith('output/digests/')) return 'digest';
    return 'artifact';
}

async function appendSucceededFileWriteManifests(
    sessionId: string,
    agentId: string,
    toolCalls: ToolCallRecord[],
): Promise<void> {
    const outputWrites = toolCalls.filter(tc => {
        if (tc.name !== 'file_write' || !isSuccessfulToolCall(tc)) return false;
        const args = tc.arguments as Record<string, unknown>;
        const path = typeof args.path === 'string' ? args.path : '';
        return path.startsWith('output/') || path.startsWith('/workspace/output/');
    });

    for (const tc of outputWrites) {
        const args = tc.arguments as Record<string, unknown>;
        const result = tc.result as Record<string, unknown> | undefined;
        const rawPath = typeof args.path === 'string' ? args.path : '';
        const relativePath = rawPath.startsWith('/workspace/') ? rawPath.slice('/workspace/'.length) : rawPath;
        const artifactId = typeof result?.artifact_id === 'string' ? result.artifact_id : randomUUID();
        const bytes = typeof result?.bytes === 'number' ? result.bytes : typeof args.content === 'string' ? args.content.length : 0;

        const entry = JSON.stringify({
            artifact_id: artifactId,
            path: relativePath,
            agent_id: agentId,
            type: manifestPathType(relativePath),
            created_at: new Date().toISOString(),
            bytes,
            session_id: sessionId,
            session_status: 'succeeded',
            trusted: true,
            published_at: new Date().toISOString(),
        });

        const b64 = Buffer.from(entry + '\n').toString('base64');
        await execInToolbox(
            `echo '${b64}' | base64 -d >> /workspace/shared/manifests/index.jsonl`,
            5_000,
        );
    }
}

function detectAuditEvidenceIssues(
    stepKind: string | null,
    toolCalls: ToolCallRecord[],
): { blocked: boolean; evidence: string[] } {
    if (stepKind !== 'audit_system') return { blocked: false, evidence: [] };

    const successfulBash = toolCalls.filter(
        tc => tc.name === 'bash' && isSuccessfulToolCall(tc),
    );
    const successfulAuditWrites = toolCalls.filter(tc => {
        if (tc.name !== 'file_write' || !isSuccessfulToolCall(tc)) return false;
        const args = tc.arguments as Record<string, unknown>;
        const path = typeof args.path === 'string' ? args.path : '';
        const content = typeof args.content === 'string' ? args.content : '';
        return (
            path.includes('output/reviews') &&
            /evidence table|command_or_source|observed_output|hostAudit|bash/i.test(content) &&
            !containsBareWorkspaceAlias(content) &&
            !containsUnsupportedAuditEvidence(content) &&
            !containsPlaceholderAuditEvidence(content)
        );
    });

    const barePathAuditWrites = toolCalls.filter(tc => {
        if (tc.name !== 'file_write' || !isSuccessfulToolCall(tc)) return false;
        const args = tc.arguments as Record<string, unknown>;
        const path = typeof args.path === 'string' ? args.path : '';
        const content = typeof args.content === 'string' ? args.content : '';
        return path.includes('output/reviews') && containsBareWorkspaceAlias(content);
    });

    const unsupportedAuditWrites = toolCalls.filter(tc => {
        if (tc.name !== 'file_write' || !isSuccessfulToolCall(tc)) return false;
        const args = tc.arguments as Record<string, unknown>;
        const path = typeof args.path === 'string' ? args.path : '';
        const content = typeof args.content === 'string' ? args.content : '';
        return path.includes('output/reviews') && containsUnsupportedAuditEvidence(content);
    });

    const placeholderAuditWrites = toolCalls.filter(tc => {
        if (tc.name !== 'file_write' || !isSuccessfulToolCall(tc)) return false;
        const args = tc.arguments as Record<string, unknown>;
        const path = typeof args.path === 'string' ? args.path : '';
        const content = typeof args.content === 'string' ? args.content : '';
        return path.includes('output/reviews') && containsPlaceholderAuditEvidence(content);
    });

    if (
        successfulBash.length > 0 &&
        successfulAuditWrites.length > 0 &&
        barePathAuditWrites.length === 0 &&
        unsupportedAuditWrites.length === 0 &&
        placeholderAuditWrites.length === 0
    ) {
        return { blocked: false, evidence: [] };
    }

    const evidence = [
        `audit evidence missing: successful bash calls=${successfulBash.length}, evidence-bearing audit writes=${successfulAuditWrites.length}`,
        'audit_system outputs must include command/source evidence before they can succeed',
    ];
    if (barePathAuditWrites.length > 0) {
        evidence.push(
            `audit path evidence invalid: ${barePathAuditWrites.length} audit write(s) used bare /output, /agents, or /projects paths`,
            'audit_system outputs must use real /workspace/... paths for commands and evidence',
        );
    }
    if (unsupportedAuditWrites.length > 0) {
        evidence.push(
            `audit unsupported evidence invalid: ${unsupportedAuditWrites.length} audit write(s) used N/A/none as command evidence`,
            'audit_system outputs must support no-issue/no-risk claims with bash output or hostAudit evidence',
        );
    }
    if (placeholderAuditWrites.length > 0) {
        evidence.push(
            `audit placeholder evidence invalid: ${placeholderAuditWrites.length} audit write(s) used generic parenthesized observed-output text`,
            'audit_system outputs must use real observed output, not placeholder excerpts like (Listing of files/dirs in /workspace/output) or (Process list excerpt, showing defunct git processes)',
        );
    }
    return { blocked: true, evidence };
}

function containsBareWorkspaceAlias(text: string): boolean {
    return /(^|[^A-Za-z0-9_/-])\/(?:output|agents|projects)\b/.test(text);
}

function containsUnsupportedAuditEvidence(text: string): boolean {
    return /^\s*\|[^\n]*\|\s*(?:N\/A|none|not applicable)\s*\|/im.test(text);
}

function containsPlaceholderAuditEvidence(text: string): boolean {
    return /\(\s*(?:listing of|file listing|directory listing|process list(?: excerpt)?|excerpt|observed output|observed-output)\b[^)]*\)/i.test(
        text,
    );
}

export function detectBlockedOutcome(
    summary: string,
    toolCalls: ToolCallRecord[],
    options?: {
        ignoreSummaryBlockers?: boolean;
    },
): {
    blocked: boolean;
    reason: string;
    evidence: string[];
} {
    const evidence: string[] = [];

    const hardBlockerMatch =
        options?.ignoreSummaryBlockers ?
            undefined
        :   HARD_BLOCKER_SUMMARY_PATTERNS.find(p => p.test(summary));
    if (hardBlockerMatch) {
        evidence.push(`summary matched hard-blocker pattern: ${hardBlockerMatch.source}`);
    }

    const softBlockerMatch =
        options?.ignoreSummaryBlockers ?
            undefined
        :   SOFT_BLOCKER_SUMMARY_PATTERNS.find(p => p.test(summary));
    const hasSuccessfulToolCall = toolCalls.some(isSuccessfulToolCall);
    const hasProgressSignals =
        hasSuccessfulToolCall ||
        PROGRESS_SUMMARY_PATTERNS.some(p => p.test(summary));

    if (softBlockerMatch && !hasProgressSignals) {
        evidence.push(`summary matched unresolved soft-blocker pattern: ${softBlockerMatch.source}`);
    }

    const toolErrors = toolCalls
        .map(tc => ({
            name: tc.name,
            text: toolErrorText(tc.result),
        }))
        .filter(tc => tc.text.length > 0);

    const fatalToolErrors = toolErrors.filter(tc =>
        TOOL_ERROR_PATTERNS.some(p => p.test(tc.text)),
    );
    for (const err of fatalToolErrors) {
        evidence.push(`tool ${err.name} error: ${err.text.slice(0, 160)}`);
    }

    const hasSuccessfulArtifactDelivery = toolCalls.some(tc => {
        if (
            tc.name !== 'file_write' &&
            tc.name !== 'send_to_agent' &&
            tc.name !== 'scratchpad_update' &&
            tc.name !== 'memory_write'
        ) return false;
        if (!tc.result || typeof tc.result !== 'object') return false;
        return !('error' in (tc.result as Record<string, unknown>));
    });

    const blockedBySummary = !!hardBlockerMatch || (!!softBlockerMatch && !hasProgressSignals);
    const blockedByFatalToolError =
        fatalToolErrors.length > 0 && !hasSuccessfulArtifactDelivery;

    if (blockedBySummary || blockedByFatalToolError) {
        const reason = blockedBySummary ?
                'Session summary reported unresolved blocker'
            :   'Fatal tool error without successful artifact delivery';
        return { blocked: true, reason, evidence };
    }

    return {
        blocked: false,
        reason: '',
        evidence: [],
    };
}

/** Context loaded for an agent session before the LLM loop starts. */
interface AgentSessionContext {
    voiceName: string;
    tools: ToolDefinition[];
    systemPrompt: string;
}

/** Load agent context and build system prompt for a session. */
async function loadAgentContext(
    session: AgentSession,
    isDroid: boolean,
    agentId: AgentId,
): Promise<AgentSessionContext> {
    const voice = isDroid ? null : getVoice(agentId);
    const voiceName = isDroid ? session.agent_id : (voice?.displayName ?? agentId);

    const tools =
        isDroid ?
            getDroidTools(session.agent_id)
        :   getAgentTools(agentId, session.id);

    const memories =
        isDroid ?
            []
        :   await queryRelevantMemories(agentId, session.prompt, {
                relevantLimit: 5,
                recentLimit: 3,
            });

    const scratchpad = isDroid ? '' : await getScratchpad(agentId);
    const briefing = isDroid ? '' : await buildBriefing(agentId);

    const recentSessions =
        isDroid ?
            []
        :   await sql`
            SELECT agent_id, prompt, result, completed_at
            FROM ops_agent_sessions
            WHERE source = 'cron'
            AND status = 'succeeded'
            AND completed_at > NOW() - INTERVAL '24 hours'
            AND id != ${session.id}
            ORDER BY completed_at DESC
            LIMIT 5
        `;

    let primeDirective = '';
    try {
        primeDirective = await loadPrimeDirective();
    } catch (error) {
        log.warn('Prime directive load failed; continuing without directive', {
            error,
            sessionId: session.id,
            agentId,
        });
    }

    const systemPrompt = buildAgentSystemPrompt({
        voice: voice ?? null,
        voiceName,
        primeDirective,
        scratchpad,
        briefing,
        memories,
        recentSessions: recentSessions as Array<{ agent_id: string; result: unknown }>,
        toolNames: tools.map(t => t.name),
        writePaths: isDroid ? [] : getAgentWritePaths(agentId),
    });

    return { voiceName, tools, systemPrompt };
}

/** Build the system prompt for an agent session from pre-loaded context. */
function buildAgentSystemPrompt(ctx: {
    voice: { systemDirective: string } | null;
    voiceName: string;
    primeDirective: string;
    scratchpad: string;
    briefing: string;
    memories: Array<{ type: string; content: string }>;
    recentSessions: Array<{ agent_id: string; result: unknown }>;
    toolNames: string[];
    writePaths: string[];
}): string {
    let prompt = '';

    if (ctx.voice) {
        prompt += `${ctx.voice.systemDirective}\n\n`;
    }

    if (ctx.primeDirective) {
        prompt += `═══ PRIME DIRECTIVE ═══\n${ctx.primeDirective}\n\n`;
    }

    prompt += `You are ${ctx.voiceName}, operating in an autonomous agent session.\n`;
    prompt += `You have tools available to accomplish your task. Use them through the provided function calling interface.\n`;
    prompt += `When your task is complete, provide a clear summary of what you accomplished.\n`;
    prompt += `IMPORTANT: When the task asks you to read, write, search, run commands, inspect Git, or publish, you MUST call the relevant tool. Do not claim you completed work without tool results.\n`;
    prompt += `IMPORTANT: Prefer the structured tool calling API. If your runtime cannot emit native tool calls, emit exactly <function_calls><invoke name="tool_name"><parameter name="param">value</parameter></invoke></function_calls>; the runtime will execute it. Do not leave tool XML in your final answer.\n`;
    prompt += `IMPORTANT: Only call tools from the list below. Do NOT invent tool names.\n\n`;

    if (ctx.toolNames.length > 0) {
        prompt += `═══ AVAILABLE TOOLS ═══\n`;
        prompt += `You may ONLY use these tools: ${ctx.toolNames.join(', ')}\n`;
        prompt += `Do NOT call tools like "google:search", "tool_code", "propose_action", or any other name not listed above.\n`;
        prompt += `If a tool call returns "Access denied" or "does not exist", do NOT retry the same call. Adjust your approach or skip that action.\n`;
        if (ctx.writePaths.length > 0) {
            prompt += `Your file_write access is restricted to these path prefixes: ${ctx.writePaths.join(', ')}\n`;
            prompt += `Do NOT attempt to write outside these paths — it will be denied.\n`;
        }
        prompt += `\n`;
    }

    if (ctx.scratchpad) {
        prompt += `═══ YOUR SCRATCHPAD (working memory) ═══\n${ctx.scratchpad}\n\n`;
    }

    if (ctx.briefing) {
        prompt += `═══ CURRENT SITUATION ═══\n${ctx.briefing}\n\n`;
    }

    if (ctx.memories.length > 0) {
        prompt += `═══ YOUR MEMORIES ═══\n`;
        for (const m of ctx.memories) {
            prompt += `- [${m.type}] ${m.content.slice(0, MEMORY_PREVIEW_LENGTH)}\n`;
        }
        prompt += `\n`;
    }

    if (ctx.recentSessions.length > 0) {
        prompt += `Recent session outputs (for context):\n`;
        for (const s of ctx.recentSessions) {
            const summary =
                (s.result as Record<string, unknown>)?.summary ??
                (s.result as Record<string, unknown>)?.text ??
                '(no summary)';
            prompt += `- [${s.agent_id}] ${String(summary).slice(0, SESSION_SUMMARY_PREVIEW_LENGTH)}\n`;
        }
        prompt += '\n';
    }

    return prompt;
}

/**
 * Run the LLM+tools loop for an agent session.
 * Returns the final text output and accumulated tool call records.
 */
async function runAgentToolLoop(opts: {
    session: AgentSession;
    agentId: AgentId;
    tools: ToolDefinition[];
    messages: LLMMessage[];
    startTime: number;
}): Promise<{ lastText: string; toolCalls: ToolCallRecord[]; rounds: number; emptyRounds: number }> {
    const { session, agentId, tools, messages, startTime } = opts;
    const allToolCalls: ToolCallRecord[] = [];
    const maxRounds = session.max_tool_rounds;
    const timeoutMs = session.timeout_seconds * 1000;
    const softDeadlineMs = timeoutMs - SESSION_SOFT_DEADLINE_BUFFER_MS;
    let lastText = '';
    let consecutiveEmptyRounds = 0;
    let emptyRounds = 0;
    let llmRounds = 0;
    let retriedEmptyNoToolRound = false;
    let retriedMissingToolContract = false;

    for (let round = 0; round < maxRounds; round++) {
        const elapsed = Date.now() - startTime;

        if (elapsed > timeoutMs) {
            await completeSession(
                session.id, 'timed_out',
                {
                    summary: lastText || 'Session timed out before completing',
                    rounds: llmRounds,
                    empty_tool_rounds: emptyRounds,
                },
                allToolCalls, llmRounds, 'Timeout exceeded',
            );
            return { lastText, toolCalls: allToolCalls, rounds: -1, emptyRounds }; // -1 signals timed_out (already written)
        }

        if (elapsed > softDeadlineMs && round > 0 && lastText) {
            log.info('Soft deadline reached, finishing with current output', {
                sessionId: session.id,
                elapsed: Math.round(elapsed / 1000),
                rounds: llmRounds,
            });
            break;
        }

        llmRounds++;

        const result = await llmGenerateWithTools({
            messages,
            temperature: 0.7,
            maxTokens: AGENT_SESSION_MAX_TOKENS,
            tools: tools.length > 0 ? tools : undefined,
            maxToolRounds: Math.min(maxRounds, AGENT_SESSION_MAX_TOOL_ROUNDS),
            trackingContext: { agentId, context: 'agent_session', sessionId: session.id },
        });

        if (result.text) {
            lastText = result.text;
            consecutiveEmptyRounds = 0;
        } else {
            consecutiveEmptyRounds++;
            emptyRounds++;
        }
        allToolCalls.push(...result.toolCalls);

        log.debug('Agent session round completed', {
            sessionId: session.id, round,
            textLength: result.text.length,
            toolCallCount: result.toolCalls.length,
            cumulativeToolCalls: allToolCalls.length,
            hasLastText: !!lastText,
            consecutiveEmptyRounds,
            emptyRounds,
        });

        if (
            !result.text &&
            result.toolCalls.length === 0 &&
            allToolCalls.length === 0 &&
            !retriedEmptyNoToolRound
        ) {
            retriedEmptyNoToolRound = true;
            messages.push({
                role: 'user',
                content:
                    'The previous response was empty. You must either call the required tools or provide final text if no tools are needed.',
            });
            continue;
        }

        if (result.toolCalls.length === 0) {
            const missingTools = missingRequiredToolNamesForSession(session, allToolCalls);
            if (missingTools.length > 0 && !retriedMissingToolContract) {
                retriedMissingToolContract = true;
                messages.push({
                    role: 'user',
                    content:
                        `Your previous response did not satisfy the required tool contract. Missing successful tool evidence: ${missingTools.join(', ')}. ` +
                        `Call the required tools now through the function calling interface. Do not describe commands or file contents as prose instead of using the tools. ` +
                        `If a required external source is unavailable, still write a file_write artifact that clearly marks status: blocked and cites the failed tool evidence.`,
                });
                continue;
            }
            break;
        }

        if (!result.text && result.toolCalls.every(
            tc => typeof tc.result === 'string' && tc.result.includes('not available'),
        )) {
            log.warn('Agent session breaking early — all tool calls returned not-available', {
                sessionId: session.id, round,
                toolCalls: result.toolCalls.map(tc => tc.name),
            });
            break;
        }

        // Break if all tool calls in this round returned access-denied errors
        if (result.toolCalls.length > 0 && result.toolCalls.every(tc => {
            const text = toolErrorText(tc.result);
            return /access denied/i.test(text) || /does not exist/i.test(text);
        })) {
            log.warn('Agent session breaking early — all tool calls denied or invalid', {
                sessionId: session.id, round,
                toolCalls: result.toolCalls.map(tc => ({ name: tc.name, error: toolErrorText(tc.result).slice(0, 100) })),
            });
            break;
        }

        if (consecutiveEmptyRounds >= MAX_CONSECUTIVE_EMPTY_ROUNDS) {
            log.warn('Agent session breaking early — consecutive empty rounds', {
                sessionId: session.id, round,
                cumulativeToolCalls: allToolCalls.length,
            });
            break;
        }

        // Feed tool results back for the next round
        const toolSummary = result.toolCalls
            .map(tc => {
                const resultStr = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result);
                const capped =
                    resultStr.length > TOOL_RESULT_MAX_LENGTH ?
                        resultStr.slice(0, TOOL_RESULT_MAX_LENGTH) + '... [truncated]'
                    :   resultStr;
                return `Tool ${tc.name}(${JSON.stringify(tc.arguments)}):\n${capped}`;
            })
            .join('\n\n');

        if (result.text) {
            messages.push({ role: 'assistant', content: result.text });
        }
        messages.push({
            role: 'user',
            content: `Tool results:\n${toolSummary}\n\nContinue with your task. If you're done, provide a final summary.`,
        });
    }

    return { lastText, toolCalls: allToolCalls, rounds: llmRounds, emptyRounds };
}

/**
 * Execute an agent session: load voice, tools, and run the LLM+tools loop.
 * Updates the session row in-place as it progresses.
 */
export async function executeAgentSession(
    session: AgentSession,
): Promise<void> {
    const startTime = Date.now();
    const isDroid = session.agent_id.startsWith('droid-');
    const agentId = session.agent_id as AgentId;

    await sql`
        UPDATE ops_agent_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ${session.id}
          AND status IN ('pending', 'queued', 'running')
    `;

    try {
        const { voiceName, tools, systemPrompt } = await loadAgentContext(session, isDroid, agentId);

        const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: session.prompt },
        ];

        const loopResult = await runAgentToolLoop({
            session, agentId, tools, messages, startTime,
        });

        // rounds === -1 means timed_out was already written inside the loop
        if (loopResult.rounds === -1) return;

        const cleanedText = extractFromXml(loopResult.lastText);
        const summary = sanitizeSummary(cleanedText);
        const isHeartbeatReportSession =
            session.agent_id === 'system' &&
            session.source === 'cron' &&
            session.prompt.trim() === 'System heartbeat';
        const blockedOutcome = detectBlockedOutcome(
            [summary, cleanedText].filter(Boolean).join('\n'),
            loopResult.toolCalls,
            {
                ignoreSummaryBlockers: isHeartbeatReportSession,
            },
        );
        const missingToolEvidence = detectMissingRequiredToolEvidence(
            session,
            loopResult.toolCalls,
        );
        const emptySessionOutcome = detectEmptySessionOutcome(
            session,
            cleanedText,
            loopResult.toolCalls,
        );
        const droidPlaceholderArtifact = detectDroidPlaceholderArtifact(
            session,
            loopResult.toolCalls,
        );

        const finalStatus =
            blockedOutcome.blocked || missingToolEvidence.blocked || emptySessionOutcome.blocked || droidPlaceholderArtifact.blocked ?
                'blocked'
            :   'succeeded';
        const blockedReason =
            blockedOutcome.blocked ?
                blockedOutcome.reason
            : missingToolEvidence.blocked ?
                missingToolEvidence.reason
            : emptySessionOutcome.blocked ?
                emptySessionOutcome.reason
            : droidPlaceholderArtifact.blocked ?
                droidPlaceholderArtifact.reason
            :   undefined;
        const blockedEvidence = [
            ...blockedOutcome.evidence,
            ...missingToolEvidence.evidence,
            ...emptySessionOutcome.evidence,
            ...droidPlaceholderArtifact.evidence,
        ];
        const completed = await completeSession(
            session.id,
            finalStatus,
            {
                text: cleanedText,
                summary,
                rounds: loopResult.rounds,
                empty_tool_rounds: loopResult.emptyRounds,
                ...(blockedReason ?
                    {
                        blocked_reason: blockedReason,
                        blocked_evidence: blockedEvidence,
                    }
                :   {}),
            },
            loopResult.toolCalls,
            loopResult.rounds,
            blockedReason,
        );
        if (!completed) return;

        if (finalStatus === 'succeeded') {
            try {
                await appendSucceededFileWriteManifests(session.id, agentId, loopResult.toolCalls);
            } catch (manifestErr) {
                log.warn('Deferred manifest append failed (non-fatal)', {
                    error: manifestErr,
                    sessionId: session.id,
                    agentId,
                });
            }
        }

        const summaryPreview = truncateToFirstSentences(cleanedText, 2000);
        if (blockedReason) {
            await emitEvent({
                agent_id: agentId,
                kind: 'agent_session_blocked',
                title: `${voiceName} session blocked`,
                summary: summaryPreview || blockedReason,
                tags: ['agent_session', 'blocked', session.source],
                metadata: {
                    sessionId: session.id,
                    source: session.source,
                    rounds: loopResult.rounds,
                    toolCalls: loopResult.toolCalls.length,
                    blockedReason,
                    blockedEvidence,
                },
            });
        } else {
            await emitEvent({
                agent_id: agentId,
                kind: 'agent_session_completed',
                title: `${voiceName} session completed`,
                summary: summaryPreview || undefined,
                tags: ['agent_session', 'completed', session.source],
                metadata: {
                    sessionId: session.id,
                    source: session.source,
                    rounds: loopResult.rounds,
                    toolCalls: loopResult.toolCalls.length,
                },
            });
        }
    } catch (err) {
        const errorMsg = (err as Error).message;
        log.error('Agent session failed', { error: err, sessionId: session.id, agentId });

        const completed = await completeSession(
            session.id, 'failed', { error: errorMsg, rounds: 0 },
            [], 0, errorMsg,
        );
        if (!completed) return;

        await emitEvent({
            agent_id: agentId,
            kind: 'agent_session_failed',
            title: `Agent session failed: ${errorMsg.slice(0, 100)}`,
            tags: ['agent_session', 'failed', session.source],
            metadata: { sessionId: session.id, error: errorMsg },
        });
    }
}

/** Update session to terminal status */
/** Strip null bytes and invalid Unicode escapes that Postgres rejects in JSONB */
function sanitizeForJsonb(obj: unknown): unknown {
    if (typeof obj === 'string') {
        return obj.replace(/\u0000/g, '').replace(/\\u0000/g, '');
    }
    if (Array.isArray(obj)) return obj.map(sanitizeForJsonb);
    if (obj && typeof obj === 'object') {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            clean[k] = sanitizeForJsonb(v);
        }
        return clean;
    }
    return obj;
}

async function completeSession(
    sessionId: string,
    status: string,
    result: Record<string, unknown>,
    toolCalls: ToolCallRecord[],
    llmRounds: number,
    error?: string,
): Promise<boolean> {
    const updated = await sql<{ id: string }[]>`
        UPDATE ops_agent_sessions
        SET status = ${status},
            result = ${jsonb(sanitizeForJsonb(result) as Record<string, unknown>)},
            tool_calls = ${jsonb(
                sanitizeForJsonb(toolCalls.map(tc => ({
                    name: tc.name,
                    arguments: tc.arguments,
                    result:
                        typeof tc.result === 'string' ?
                            tc.result.slice(0, 2000)
                        :   tc.result,
                }))) as unknown[],
            )},
            llm_rounds = ${llmRounds},
            error = ${error ?? null},
            completed_at = NOW()
        WHERE id = ${sessionId}
          AND status = 'running'
        RETURNING id
    `;
    if (updated.length === 0) {
        log.warn('Skipped terminal session update because session was not running', {
            sessionId,
            status,
        });
        return false;
    }
    return true;
}
