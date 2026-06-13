// scratchpad_read + scratchpad_update tools — agent working memory
// Uses factory pattern to bind agentId (same approach as file_write).
import type { NativeTool } from '../types';
import { getScratchpad, updateScratchpad } from '@/lib/ops/scratchpad';

export function createScratchpadReadExecute(agentId: string) {
    return async () => {
        const content = await getScratchpad(agentId);
        return {
            content: content || '(empty — write your first scratchpad entry)',
            length: content.length,
        };
    };
}

export function createScratchpadUpdateExecute(agentId: string) {
    return async (params: Record<string, unknown>) => {
        const content = params.content as string;
        if (!content || content.trim().length === 0) {
            return { error: 'Content cannot be empty' };
        }
        return updateScratchpad(agentId, content);
    };
}

export const scratchpadReadTool: NativeTool = {
    name: 'scratchpad_read',
    description:
        'Read your working memory scratchpad. Returns your current notes, priorities, and context that persists between sessions.',
    agents: ['chora', 'subrosa', 'thaum', 'praxis', 'mux', 'primus'],
    parameters: {
        type: 'object',
        properties: {},
        required: [],
    },
};

export const scratchpadUpdateTool: NativeTool = {
    name: 'scratchpad_update',
    description:
        'Update your working memory scratchpad. Use this to maintain notes, track priorities, record hypotheses, and keep context between sessions. Max 2000 characters. This REPLACES your entire scratchpad — include everything you want to keep.',
    agents: ['chora', 'subrosa', 'thaum', 'praxis', 'mux', 'primus'],
    parameters: {
        type: 'object',
        properties: {
            content: {
                type: 'string',
                description:
                    'Your full scratchpad content (markdown). Include current focus, active threads, hypotheses, and notes to self.',
            },
        },
        required: ['content'],
    },
};
