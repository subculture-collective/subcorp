import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('LLM empty round observability', () => {
    test('metrics distinguish unrecovered empty text from empty tool-only rounds', () => {
        const metrics = read('src/lib/metrics.ts');
        expect(metrics).toContain('subcorp_llm_empty_text_total');
        expect(metrics).toContain('subcorp_llm_empty_tool_round_total');
        expect(metrics).toContain('incLlmEmptyToolRound');
    });

    test('agent sessions persist empty round count in terminal result', () => {
        const session = read('src/lib/tools/agent-session.ts');
        expect(session).toContain('emptyRounds');
        expect(session).toContain('empty_tool_rounds');
        expect(session).toContain('consecutiveEmptyRounds');
    });

    test('agent sessions retry the first empty no-tool round with explicit guidance', () => {
        const session = read('src/lib/tools/agent-session.ts');
        expect(session).toContain('retriedEmptyNoToolRound');
        expect(session).toContain('The previous response was empty. You must either call the required tools or provide final text if no tools are needed.');
    });
});

describe('roundtable empty-output recovery', () => {
    test('opening empty dialogue is retried with a plain-text instruction before aborting', () => {
        const source = read('src/lib/roundtable/orchestrator.ts');

        expect(source).toContain('Empty opening dialogue from LLM, retrying with explicit plain-text instruction');
        expect(source).toContain('roundtable:${session.format}:empty_retry');
        expect(source).toContain('Return 2-4 sentences of plain spoken dialogue only');
        expect(source).toContain('All LLM turns returned empty responses');
    });

    test('empty dialogue retry applies to every turn and records metadata', () => {
        const source = read('src/lib/roundtable/orchestrator.ts');

        expect(source).toContain('ROUNDTABLE_EMPTY_TURN_RETRY_LIMIT');
        expect(source).toContain('ROUNDTABLE_PLAIN_DIALOGUE_INSTRUCTION');
        expect(source).toContain('Empty roundtable dialogue from LLM, retrying with explicit plain-text instruction');
        expect(source).toContain('emptyDialogueCount');
        expect(source).toContain('emptyDialogueRetryCount');
        expect(source).toContain('roundtableRoutingContext');
        expect(source).not.toContain('if (!dialogue && history.length === 0)');
    });

    test('deep dive turns include plain dialogue guidance before retry', () => {
        const source = read('src/lib/roundtable/orchestrator.ts');

        expect(source).toContain('initialDialogueTemperature');
        expect(source).toContain('dialoguePrompt');
        expect(source).toContain('dialogueTrackingContext');
        expect(source).toContain('ROUNDTABLE_DEEP_DIVE_GROUNDING_INSTRUCTION');
        expect(source).toContain('Do not invent file paths, function names, metrics, or source-code facts');
        expect(source).toContain('frame technical claims as hypotheses to verify');
        expect(source).toContain("format === 'deep_dive'");
        expect(source).toContain('dialoguePrompt(\n                            userPrompt,\n                            session.format,');
        expect(source).toContain('initialDialogueTemperature(\n                    effectiveTemperature,\n                    session.format,');
        expect(source).toContain("return 'roundtable:deep_dive:empty_retry'");
        expect(source).toContain('Math.max(0.4, temperature - 0.2)');
    });

    test('zero-turn content reviews are blocked instead of endlessly requeued', () => {
        const source = read('src/lib/roundtable/orchestrator.ts');

        expect(source).toContain('markContentReviewBlockedAfterZeroTurnFailure');
        expect(source).toContain('review_blocked_model_empty');
        expect(source).toContain("status = 'needs_revision'");
        expect(source).toContain("session.format !== 'content_review'");
    });

    test('roundtables use an explicit qwen3 model route', () => {
        const routing = read('src/lib/llm/model-routing.ts');
        const compose = read('docker-compose.yml');

        expect(routing).toContain('MODEL_ROUTING_ROUNDTABLE__DEEP_DIVE');
        expect(routing).toContain('prefix before');
        expect(compose).toContain('MODEL_ROUTING_ROUNDTABLE=ollama/qwen3:14b');
    });
});
