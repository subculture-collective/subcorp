import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('OpenRouter cost-controlled fallback policy', () => {
    test('local tool routing defaults to provider-prefixed Gemma before cloud fallback', () => {
        const client = read('src/lib/llm/client.ts');
        const routing = read('src/lib/llm/model-routing.ts');

        expect(client).toContain("const DEFAULT_OLLAMA_FALLBACK_MODELS = ['ollama/gemma4:latest'];");
        expect(client).toContain("normalized.startsWith('ollama/')");
        expect(routing).toContain("'ollama/gemma4:latest'");
    });

    test('OpenRouter fallback uses cheap defaults and explicit budget guardrails', () => {
        const client = read('src/lib/llm/client.ts');

        expect(client).toContain("OPENROUTER_DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL ?? 'deepseek/deepseek-v4-flash'");
        expect(client).toContain("OPENROUTER_ESCALATION_MODEL = process.env.OPENROUTER_ESCALATION_MODEL ?? 'deepseek/deepseek-v3.2'");
        expect(client).toContain("OPENROUTER_CODER_MODEL = process.env.OPENROUTER_CODER_MODEL ?? 'qwen/qwen3-coder-flash'");
        expect(client).toContain('OPENROUTER_DAILY_BUDGET_USD');
        expect(client).toContain('OPENROUTER_MONTHLY_BUDGET_USD');
        expect(client).toContain('checkOpenRouterBudget');
        expect(client).toContain('openrouter_daily_budget_exceeded');
        expect(client).toContain('openrouter_monthly_budget_exceeded');
    });

    test('OpenRouter requests include cache/session fields and attribution headers', () => {
        const client = read('src/lib/llm/client.ts');

        expect(client).toContain('X-Session-Id');
        expect(client).toContain('session_id');
        expect(client).toContain('HTTP-Referer');
        expect(client).toContain('X-Title');
        expect(client).toContain('withOpenRouterCacheFields');
        expect(client).toContain('openRouterSessionId');
    });

    test('OpenRouter tool loops are capped and cost-estimated', () => {
        const client = read('src/lib/llm/client.ts');

        expect(client).toContain('OPENROUTER_MAX_TOOL_ROUNDS');
        expect(client).toContain('OPENROUTER_MAX_TOKENS');
        expect(client).toContain('Math.min(maxToolRounds, OPENROUTER_MAX_TOOL_ROUNDS)');
        expect(client).toContain('Math.min(maxTokens, OPENROUTER_MAX_TOKENS)');
        expect(client).toContain('OPENROUTER_PRICE_PER_MILLION');
        expect(client).toContain('estimateOpenRouterCostUsd');
        expect(client).toContain('toOpenRouterChatUsage');
        expect(client).toContain('openrouter/${normalizeOpenRouterModel');
    });
});
