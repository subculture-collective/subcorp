// memory_write tool — self-directed memory formation
// Uses factory pattern to bind agentId (same approach as file_write).
import type { NativeTool } from '../types';
import { writeMemory, enforceMemoryCap } from '@/lib/ops/memory';
import type { MemoryType } from '@/lib/types';

const VALID_MEMORY_TYPES: MemoryType[] = [
    'insight',
    'pattern',
    'strategy',
    'preference',
    'lesson',
];

export function createMemoryWriteExecute(agentId: string) {
    return async (params: Record<string, unknown>) => {
        const type = params.type as string;
        const content = params.content as string;
        const confidence = (params.confidence as number) ?? 0.7;
        const tagsStr = (params.tags as string) ?? '';

        if (!VALID_MEMORY_TYPES.includes(type as MemoryType)) {
            return {
                error: `Invalid type "${type}". Must be one of: ${VALID_MEMORY_TYPES.join(', ')}`,
            };
        }

        if (!content || content.trim().length === 0) {
            return { error: 'Content cannot be empty' };
        }
        if (content.length > 200) {
            return {
                error: `Content too long (${content.length} chars). Max 200.`,
            };
        }

        if (confidence < 0.4 || confidence > 1.0) {
            return { error: 'Confidence must be between 0.4 and 1.0' };
        }

        const tags = tagsStr
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        const id = await writeMemory({
            agent_id: agentId,
            type: type as MemoryType,
            content: content.trim(),
            confidence,
            tags,
            source_trace_id: `self:${agentId}:${Date.now()}`,
        });

        if (id) {
            await enforceMemoryCap(agentId);
            return { written: true, memory_id: id };
        }

        return {
            written: false,
            reason: 'Duplicate or below confidence threshold',
        };
    };
}

export const memoryWriteTool: NativeTool = {
    name: 'memory_write',
    description:
        'Write a memory that will persist across all future sessions. Use when something important comes up that you want to remember long-term. Memories are typed (insight, pattern, strategy, preference, lesson) and tagged for retrieval.',
    agents: ['chora', 'subrosa', 'thaum', 'praxis', 'mux', 'primus'],
    parameters: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                description:
                    'Memory type: insight (observation), pattern (recurring theme), strategy (approach), preference (value/style), lesson (learned from experience)',
                enum: VALID_MEMORY_TYPES,
            },
            content: {
                type: 'string',
                description:
                    'What to remember. Max 200 characters. Be concise and specific.',
            },
            confidence: {
                type: 'number',
                description:
                    'How confident you are (0.4-1.0). Higher = more certain.',
            },
            tags: {
                type: 'string',
                description:
                    'Comma-separated tags for retrieval (e.g. "governance,user,preference")',
            },
        },
        required: ['type', 'content'],
    },
};
