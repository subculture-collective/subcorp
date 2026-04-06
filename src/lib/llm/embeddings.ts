// Embedding client — switchable between local Ollama and OpenRouter
//
// Providers (set via EMBEDDING_PROVIDER env var):
//   "ollama"     — local Ollama on almaz via EMBEDDING_OLLAMA_URL (default)
//   "openrouter" — OpenAI text-embedding-3-small via OpenRouter ($0.02/M tokens)
//
// Both produce 1024-dim vectors matching the pgvector column.
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'embeddings' });

// ─── Provider selection ────────────────────────────────────
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER ?? 'ollama';

// ─── Ollama (local on almaz) ───────────────────────────────
const EMBEDDING_OLLAMA_URL = process.env.EMBEDDING_OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'bge-m3';

// ─── OpenRouter (cloud fallback) ───────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const OPENROUTER_EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const OPENROUTER_EMBEDDING_DIMENSIONS = 1024;

const EMBEDDING_TIMEOUT_MS = 15_000;

/**
 * Get embedding vector via the configured provider.
 * Returns null on failure (fire-and-forget safe).
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
    if (EMBEDDING_PROVIDER === 'ollama') {
        return getEmbeddingOllama(text);
    }
    return getEmbeddingOpenRouter(text);
}

/** Embedding via local Ollama on almaz. */
async function getEmbeddingOllama(text: string): Promise<number[] | null> {
    if (!EMBEDDING_OLLAMA_URL) return null;

    try {
        const response = await fetch(
            `${EMBEDDING_OLLAMA_URL}/v1/embeddings`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_EMBEDDING_MODEL,
                    input: text,
                }),
                signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
            },
        );

        if (!response.ok) {
            log.debug('Ollama embedding request failed', {
                status: response.status,
                url: EMBEDDING_OLLAMA_URL,
                model: OLLAMA_EMBEDDING_MODEL,
            });
            return null;
        }

        const data = (await response.json()) as {
            data?: Array<{ embedding: number[] }>;
        };
        return data.data?.[0]?.embedding ?? null;
    } catch {
        log.debug('Ollama embedding error (host unreachable?)', {
            url: EMBEDDING_OLLAMA_URL,
            model: OLLAMA_EMBEDDING_MODEL,
        });
        return null;
    }
}

/** Embedding via OpenRouter (cloud). */
async function getEmbeddingOpenRouter(text: string): Promise<number[] | null> {
    if (!OPENROUTER_API_KEY) return null;

    try {
        const response = await fetch(
            'https://openrouter.ai/api/v1/embeddings',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model: OPENROUTER_EMBEDDING_MODEL,
                    input: text,
                    dimensions: OPENROUTER_EMBEDDING_DIMENSIONS,
                }),
                signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
            },
        );

        if (!response.ok) {
            log.debug('OpenRouter embedding request failed', { status: response.status });
            return null;
        }

        const data = (await response.json()) as {
            data?: Array<{ embedding: number[] }>;
        };
        return data.data?.[0]?.embedding ?? null;
    } catch {
        return null;
    }
}
