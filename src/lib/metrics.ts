import { Counter, register } from 'prom-client';

export const llmEmptyTextTotal = new Counter({
    name: 'subcorp_llm_empty_text_total',
    help: 'LLM calls that returned empty final text, labelled by provider, context, and agent.',
    labelNames: ['provider', 'context', 'agent_id'] as const,
    registers: [register],
});

export const llmEmptyToolRoundTotal = new Counter({
    name: 'subcorp_llm_empty_tool_round_total',
    help: 'LLM tool rounds that returned no final text but did execute one or more tools.',
    labelNames: ['provider', 'context', 'agent_id'] as const,
    registers: [register],
});

export const workspaceWorldWritableFilesTotal = new Counter({
    name: 'subcorp_workspace_world_writable_files_total',
    help: 'World-writable files found during heartbeat workspace permission checks.',
    labelNames: ['scope'] as const,
    registers: [register],
});

export const webSearchFallbackTotal = new Counter({
    name: 'subcorp_web_search_fallback_total',
    help: 'Web search requests that fell back from a primary provider to a secondary provider.',
    labelNames: ['from_provider', 'to_provider', 'reason'] as const,
    registers: [register],
});

export function incLlmEmptyText(labels: {
    provider: string;
    context?: string | null;
    agentId?: string | null;
}): void {
    llmEmptyTextTotal.inc({
        provider: labels.provider,
        context: labels.context ?? 'unknown',
        agent_id: labels.agentId ?? 'unknown',
    });
}

export function incLlmEmptyToolRound(labels: {
    provider: string;
    context?: string | null;
    agentId?: string | null;
}): void {
    llmEmptyToolRoundTotal.inc({
        provider: labels.provider,
        context: labels.context ?? 'unknown',
        agent_id: labels.agentId ?? 'unknown',
    });
}

export function incWebSearchFallback(labels: {
    fromProvider: string;
    toProvider: string;
    reason: string;
}): void {
    webSearchFallbackTotal.inc({
        from_provider: labels.fromProvider,
        to_provider: labels.toProvider,
        reason: labels.reason,
    });
}
