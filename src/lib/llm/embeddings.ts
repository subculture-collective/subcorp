// Embedding client — OpenRouter-compatible /v1/embeddings endpoint
// Uses OpenAI text-embedding-3-small via OpenRouter ($0.02/M tokens)
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'embeddings' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1024;
const EMBEDDING_TIMEOUT_MS = 15_000;

/** Get embedding vector via OpenRouter. Returns null on failure (fire-and-forget safe). */
export async function getEmbedding(text: string): Promise<number[] | null> {
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
                    model: EMBEDDING_MODEL,
                    input: text,
                    dimensions: EMBEDDING_DIMENSIONS,
                }),
                signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
            },
        );

        if (!response.ok) {
            log.debug('Embedding request failed', { status: response.status });
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
