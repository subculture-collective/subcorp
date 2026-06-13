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
});
