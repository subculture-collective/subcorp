import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('LLM provider fallback clarity regressions', () => {
    test('metrics expose provider fallback decisions with attempted flag', () => {
        const metrics = read('src/lib/metrics.ts');

        expect(metrics).toContain('subcorp_llm_provider_fallback_total');
        expect(metrics).toContain('incLlmProviderFallback');
        expect(metrics).toContain("labelNames: ['from_provider', 'to_provider', 'reason', 'context', 'attempted']");
    });

    test('LLM client logs explicit OpenRouter fallback policy decisions', () => {
        const client = read('src/lib/llm/client.ts');

        expect(client).toContain('openRouterFallbackPolicy');
        expect(client).toContain('recordProviderFallbackDecision');
        expect(client).toContain('LLM provider fallback decision');
        expect(client).toContain('openRouterEnabled');
        expect(client).toContain('openRouterApiKeyPresent');
        expect(client).toContain('requireLocalFailure');
        expect(client).toContain('allowAfterLocalFailure');
        expect(client).toContain('dailyBudgetUsd');
        expect(client).toContain('monthlyBudgetUsd');
    });

    test('budget, direct-chat, and tool fallback paths are labelled', () => {
        const client = read('src/lib/llm/client.ts');

        expect(client).toContain('Ollama returned empty; no cloud fallback configured');
        expect(client).toContain('budget.reason');
        expect(client).toContain('local_failed_openrouter_allowed');
        expect(client).toContain('local_tool_failed_openrouter_allowed');
        expect(client).toContain('responses_empty_or_failed_direct_chat_fallback');
        expect(client).toContain('openrouter_text_failed_ollama_text_last_resort');
        expect(client).toContain('openrouter_tool_failed_ollama_text_last_resort');
        expect(client).toContain("fromProvider: localWasTried ? 'ollama' : 'none'");
        expect(client).toContain("fromProvider: localWasTried ? 'ollama-tools' : 'none'");
        expect(client).toContain('modelList');
        expect(client).toContain('resolvedModels');
    });

    test('disabled OpenRouter does not record a provider fallback decision', () => {
        const client = read('src/lib/llm/client.ts');

        expect(client).not.toContain('openrouter_policy_disabled');
        expect(client).not.toContain('openrouter_tool_policy_disabled');
    });
});
