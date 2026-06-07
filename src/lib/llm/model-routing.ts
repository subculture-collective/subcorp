// Model routing — env is the editable source of truth.
// Keep one default route, then add only contexts that need a different model.
//
// Env var naming:
//   MODEL_ROUTING_DEFAULT=qwen3:14b
//   MODEL_ROUTING_AGENT_SESSION=gemma4:latest
//   MODEL_ROUTING_ROUNDTABLE__DEEP_DIVE=qwen3:32b
// Double underscores become colons: ROUNDTABLE__DEEP_DIVE → roundtable:deep_dive.

/** Single default model for Ollama/llama-line operation. */
export const DEFAULT_MODELS = [
    process.env.MODEL_ROUTING_DEFAULT || process.env.OLLAMA_MODEL || 'qwen3:14b',
];

const ENV_PREFIX = 'MODEL_ROUTING_';
const CONTROL_ENV_KEYS = new Set(['MODEL_ROUTING_ENABLED']);
const MODEL_ROUTING_ENABLED = process.env.MODEL_ROUTING_ENABLED !== 'false';

function normalizeContext(context: string): string {
    return context.replace(/-/g, '_');
}

function parseModels(value: string | undefined): string[] | null {
    const models = value
        ?.split(',')
        .map(model => model.trim())
        .filter(Boolean);
    return models && models.length > 0 ? models : null;
}

function envKeyToContext(key: string): string {
    return key
        .slice(ENV_PREFIX.length)
        .toLowerCase()
        .replace(/__/g, ':');
}

function loadEnvRoutes(): Map<string, string[]> {
    const routes = new Map<string, string[]>();

    for (const [key, value] of Object.entries(process.env)) {
        if (!key.startsWith(ENV_PREFIX) || CONTROL_ENV_KEYS.has(key)) continue;

        const models = parseModels(value);
        if (!models) continue;

        routes.set(envKeyToContext(key), models);
    }

    return routes;
}

/**
 * Resolve the ordered model list for a tracking context.
 * Cascading lookup: exact env route → prefix before ':' → MODEL_ROUTING_DEFAULT/OLLAMA_MODEL.
 */
export async function resolveModels(context?: string): Promise<string[]> {
    if (!MODEL_ROUTING_ENABLED) return DEFAULT_MODELS;

    const routes = loadEnvRoutes();
    if (!context) return routes.get('default') ?? DEFAULT_MODELS;

    const normalized = normalizeContext(context);
    const exact = routes.get(normalized);
    if (exact) return exact;

    const colonIdx = normalized.indexOf(':');
    if (colonIdx > 0) {
        const prefix = normalized.slice(0, colonIdx);
        const prefixResult = routes.get(prefix);
        if (prefixResult) return prefixResult;
    }

    return routes.get('default') ?? DEFAULT_MODELS;
}
