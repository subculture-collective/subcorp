// Step Prompts — maps mission step kinds to explicit prompts with tool instructions
// Used when routing mission steps through agent sessions instead of bare LLM calls.
//
// Templates are loaded from the ops_step_templates DB table (60s cache).
// Falls back to the hardcoded STEP_INSTRUCTIONS map if no DB template exists.

import { sql } from '@/lib/db';
import { getVoice } from '../roundtable/voices';
import type { StepKind } from '../types';

const WORKSPACE_ROOT =
    process.env.WORKSPACE_ROOT ?? '/workspace/projects/subcult-corp';

export interface StepPromptContext {
    missionTitle: string;
    agentId: string;
    payload: Record<string, unknown>;
    outputPath?: string;
}

export interface StepTemplate {
    kind: string;
    template: string;
    tools_hint: string[];
    output_hint: string | null;
    version: number;
}

// ─── Template cache (60s TTL) ───

const TEMPLATE_CACHE_TTL_MS = 60_000;
const templateCache = new Map<
    string,
    { template: StepTemplate | null; ts: number }
>();

export async function loadStepTemplate(
    kind: string,
): Promise<StepTemplate | null> {
    const cached = templateCache.get(kind);
    if (cached && Date.now() - cached.ts < TEMPLATE_CACHE_TTL_MS) {
        return cached.template;
    }

    const [row] = await sql<[StepTemplate?]>`
        SELECT kind, template, tools_hint, output_hint, version
        FROM ops_step_templates WHERE kind = ${kind}
    `;

    const template = row ?? null;
    templateCache.set(kind, { template, ts: Date.now() });
    return template;
}

/** Render a DB template by replacing {{key}} placeholders with context values */
function renderTemplate(
    template: string,
    vars: Record<string, string>,
): string {
    return template.replace(
        /\{\{(\w+)\}\}/g,
        (_, key: string) => vars[key] ?? `{{${key}}}`,
    );
}

/**
 * Build an explicit, tool-aware prompt for a mission step.
 * Tries DB template first, falls back to hardcoded STEP_INSTRUCTIONS.
 * Returns the rendered prompt and the template version (if from DB).
 */
export async function buildStepPrompt(
    kind: StepKind,
    ctx: StepPromptContext,
): Promise<string>;
export async function buildStepPrompt(
    kind: StepKind,
    ctx: StepPromptContext,
    opts: { withVersion: true },
): Promise<{ prompt: string; templateVersion: number | null }>;
export async function buildStepPrompt(
    kind: StepKind,
    ctx: StepPromptContext,
    opts?: { withVersion: true },
): Promise<string | { prompt: string; templateVersion: number | null }> {
    const today = new Date().toISOString().split('T')[0];
    const payloadStr = JSON.stringify(ctx.payload, null, 2);
    const outputDir = ctx.outputPath ?? `agents/${ctx.agentId}/notes`;

    const voice = getVoice(ctx.agentId);
    let header = `Mission: ${ctx.missionTitle}\n`;
    header += `Step: ${kind}\n`;
    header += `Agent: ${ctx.agentId}\n`;
    if (voice) {
        header += `\n--- AGENT PERSONA ---\n${voice.systemDirective}\n--- END PERSONA ---\n`;
    }
    header += `\nPayload: ${payloadStr}\n\n`;

    // Try DB template first
    let dbTemplate: StepTemplate | null = null;
    try {
        dbTemplate = await loadStepTemplate(kind);
    } catch {
        // DB unavailable — fall through to hardcoded
    }

    if (dbTemplate) {
        const vars: Record<string, string> = {
            date: today,
            agentId: ctx.agentId,
            missionTitle: ctx.missionTitle,
            missionSlug: slugify(ctx.missionTitle),
            outputDir,
            payload: payloadStr,
        };
        const rendered = renderTemplate(dbTemplate.template, vars);
        const prompt = header + rendered;
        return opts?.withVersion ?
                { prompt, templateVersion: dbTemplate.version }
            :   prompt;
    }

    // Fall back to hardcoded instructions
    let body: string;
    const stepInstructions = STEP_INSTRUCTIONS[kind];
    if (stepInstructions) {
        body = stepInstructions(ctx, today, outputDir);
    } else {
        body = `Execute this step thoroughly. Write your results to ${outputDir}/ using file_write.\n`;
        body += `Provide a detailed summary of what you accomplished.\n`;
    }

    const prompt = header + body;
    return opts?.withVersion ? { prompt, templateVersion: null } : prompt;
}

type StepInstructionFn = (
    ctx: StepPromptContext,
    today: string,
    outputDir: string,
) => string;

const STEP_INSTRUCTIONS: Partial<Record<StepKind, StepInstructionFn>> = {
    research_topic: (ctx, today, outputDir) =>
        `Use web_search to research the topic described in the payload.\n` +
        `Search for 3-5 relevant queries to build a comprehensive picture.\n` +
        `Use web_fetch to read the most relevant pages.\n` +
        `Write your research notes to ${outputDir}/${today}__research__notes__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "research_topic", status: "complete".\n` +
        `Include: key findings, sources, quotes, and your analysis.\n`,

    scan_signals: (ctx, today, outputDir) =>
        `Use web_search to scan for signals related to the payload topic.\n` +
        `Look for recent developments, trends, and notable changes.\n` +
        `Write a signal report to ${outputDir}/${today}__scan__signals__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `Format: bullet points grouped by signal type (opportunity, threat, trend, noise).\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "scan_signals", status: "complete".\n` +
        `Focus on scanning and documenting signals only. Do not call propose_mission during this step.\n`,

    draft_essay: (ctx, today) =>
        `Read any research notes from agents/${ctx.agentId}/notes/ using file_read.\n` +
        `Draft an essay based on the payload and your research.\n` +
        `Write the draft to output/reports/${today}__draft__essay__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `Include YAML front matter with artifact_id, created_at, agent_id, workflow_stage: "draft", status: "draft".\n`,

    draft_thread: (ctx, today) =>
        `Read any research notes from agents/${ctx.agentId}/notes/ using file_read.\n` +
        `Draft a concise thread (5-10 punchy points) based on the payload.\n` +
        `Write to output/reports/${today}__draft__thread__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "draft_thread", status: "draft".\n`,

    critique_content: (ctx, today) =>
        `Read the artifact or content referenced in the payload using file_read.\n` +
        `Write a structured critique to output/reviews/${today}__critique__review__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.\n` +
        `Cover: strengths, weaknesses, factual accuracy, tone, suggestions for improvement.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "critique_content", status: "complete".\n`,

    audit_system: (ctx, today) =>
        `Use bash to run system checks relevant to the payload.\n` +
        `Check file permissions, exposed ports, running services, or whatever the payload specifies.\n` +
        `Write findings to output/reviews/${today}__audit__security__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `Rate findings by severity: critical, high, medium, low, info.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "audit_system", status: "complete".\n`,

    patch_code: (ctx, today, outputDir) =>
        `You are working in the subcult-corp repo at ${WORKSPACE_ROOT}/.\n` +
        `Use bash to run: cd ${WORKSPACE_ROOT} && git status\n` +
        `Read the relevant source files using file_read.\n` +
        `Make changes as described in the payload using file_write.\n` +
        `After writing changes, use bash to run build checks:\n` +
        `  cd ${WORKSPACE_ROOT} && npx tsc --noEmit 2>&1 | head -30\n` +
        `If the build passes, commit your changes:\n` +
        `  cd ${WORKSPACE_ROOT} && git add -A && git commit -m "${ctx.missionTitle}"\n` +
        `Write a change log to ${outputDir}/${today}__patch__code__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "patch_code", status: "complete".\n`,

    distill_insight: (ctx, today) =>
        `Read recent outputs from output/ and agents/${ctx.agentId}/notes/ using file_read.\n` +
        `Synthesize into a concise digest of key insights.\n` +
        `Write to output/digests/${today}__distill__insight__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "distill_insight", status: "complete".\n`,

    document_lesson: (ctx, today) =>
        `Document the lesson or knowledge described in the payload.\n` +
        `Write clear, reusable documentation to the appropriate projects/ docs/ directory.\n` +
        `If no specific project, write to output/reports/${today}__docs__lesson__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "document_lesson", status: "complete".\n`,

    convene_roundtable: (ctx, today, outputDir) =>
        `This step triggers a roundtable conversation.\n` +
        `Extract from the payload:\n` +
        `  - format: the roundtable format (e.g. brainstorm, strategy, triage, deep_dive)\n` +
        `  - topic: the seed prompt for discussion\n` +
        `  - participants: (optional) specific agent IDs to include\n` +
        `  - context: (optional) any background artifacts or prior decisions\n` +
        `Use the convene_roundtable tool with these parameters.\n` +
        `After the roundtable completes, write a brief convening summary to ${outputDir}/${today}__roundtable__convened__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.\n` +
        `Include: format used, topic, participant count, and whether artifacts were produced.\n`,

    propose_workflow: (ctx, today, outputDir) =>
        `Based on the payload, propose a multi-step workflow as a mission.\n` +
        `Analyze what needs to be accomplished and decompose it into ordered steps.\n` +
        `For each step, specify:\n` +
        `  - step_kind: one of the valid step kinds (research_topic, scan_signals, draft_essay, draft_thread, critique_content, audit_system, patch_code, distill_insight, document_lesson, convene_roundtable, draft_product_spec, update_directive, create_pull_request, memory_archaeology, content_revision)\n` +
        `  - agent_id: the best-suited agent (chora for analysis, subrosa for security/risk, thaum for creative, praxis for execution, mux for formatting/drafting, primus for coordination)\n` +
        `  - payload: the specific input for that step\n` +
        `  - depends_on: which prior steps this depends on (by index)\n` +
        `Use the propose_mission tool with the workflow steps.\n` +
        `Write the proposal to ${outputDir}/${today}__workflow__proposal__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "propose_workflow", status: "proposed".\n`,

    draft_product_spec: (ctx, today) =>
        `Read recent research notes and roundtable artifacts from agents/ and output/ using file_read.\n` +
        `Look for brainstorm sessions, strategy discussions, and signal reports.\n` +
        `Draft a structured product specification document with:\n` +
        `  - YAML front matter (artifact_id, created_at, agent_id, status: "draft")\n` +
        `  - Problem statement\n` +
        `  - Proposed solution\n` +
        `  - User stories / use cases\n` +
        `  - Technical requirements\n` +
        `  - Success metrics\n` +
        `  - Open questions\n` +
        `Write the spec to output/reports/${today}__product__spec__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n`,

    update_directive: (ctx, today) =>
        `Read the current prime directive from shared/prime-directive.md using file_read.\n` +
        `Read any recent product specs from output/reports/ using file_read (look for product__spec files).\n` +
        `Read recent strategy roundtable artifacts from output/ using file_read.\n` +
        `Based on the current state of the project, write an updated prime directive.\n` +
        `The directive should:\n` +
        `  - Reflect the current product direction\n` +
        `  - Set clear priorities and focus areas\n` +
        `  - Define success criteria for the current period\n` +
        `  - Be concise and actionable (under 500 words)\n` +
        `Write the updated directive to shared/prime-directive.md using file_write.\n` +
        `Also write a changelog entry to agents/primus/notes/${today}__directive__update__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.\n`,

    create_pull_request: (ctx, today, outputDir) =>
        `You are creating a pull request from the agents/workspace branch.\n` +
        `Use bash to check the diff:\n` +
        `  cd ${WORKSPACE_ROOT} && git diff --stat HEAD~5\n` +
        `  cd ${WORKSPACE_ROOT} && git log --oneline -10\n` +
        `If GITHUB_TOKEN is set, push and create a PR:\n` +
        `  cd ${WORKSPACE_ROOT} && git push -u origin agents/workspace 2>&1\n` +
        `  cd ${WORKSPACE_ROOT} && gh pr create --base main --head agents/workspace --title "${ctx.missionTitle}" --body "Auto-generated by agent workflow" 2>&1\n` +
        `If GITHUB_TOKEN is NOT set or push fails, write a PR summary to ${outputDir}/${today}__pr__summary__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `The summary should include: branch name, commit list, diff stats, and a description of all changes.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "create_pull_request", status: "complete".\n`,

    content_revision: (ctx, today, outputDir) =>
        `You are revising a previously reviewed piece of content based on reviewer feedback.\n` +
        `The payload contains the original draft and the reviewer notes explaining what needs to change.\n` +
        `Read the original artifact referenced in the payload using file_read.\n` +
        `Apply every piece of reviewer feedback. Do not ignore or soften critical notes — address each one directly.\n` +
        `Preserve the original voice and intent while improving quality, accuracy, and clarity.\n` +
        `Write the revised artifact to ${outputDir}/${today}__revision__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "content_revision", status: "complete", original_artifact: <id of the original>.\n`,

    memory_archaeology: (ctx, today, outputDir) =>
        `Perform a memory archaeology dig to analyze agent memories for patterns, contradictions, emergence, echoes, and drift.\n` +
        `Use the memory_search tool to retrieve relevant memories from the collective.\n` +
        `Analyze the memories for:\n` +
        `  - **Patterns**: Recurring themes, behaviors, or ideas across multiple memories\n` +
        `  - **Contradictions**: Conflicting memories or opposing viewpoints\n` +
        `  - **Emergence**: New behaviors, ideas, or perspectives that appear in recent memories\n` +
        `  - **Echoes**: Specific phrases, metaphors, or ideas that reappear across contexts\n` +
        `  - **Drift**: How perspectives, tone, or beliefs have shifted over time\n` +
        `Write your findings to ${outputDir}/${today}__archaeology__findings__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.\n` +
        `For each finding, include:\n` +
        `  1. Finding type (pattern/contradiction/emergence/echo/drift)\n` +
        `  2. A concise title\n` +
        `  3. Detailed description with evidence from specific memories\n` +
        `  4. Confidence level (0.0 to 1.0)\n` +
        `  5. Related agent IDs\n` +
        `Be specific and evidence-based. Include memory IDs and excerpts to support your findings.\n`,
};

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
}
