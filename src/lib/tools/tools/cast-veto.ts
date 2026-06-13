// cast_veto tool — allows agents to cast vetoes on proposals, missions, governance changes, and steps
import type { NativeTool } from '../types';
import { castVeto } from '@/lib/ops/veto';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'cast-veto' });

/**
 * Create a cast_veto execute function bound to a specific agentId.
 * The agentId is captured via closure to identify who is casting.
 */
export function createCastVetoExecute(agentId: string) {
    return async (params: Record<string, unknown>) => {
        const targetType = params.target_type as string;
        const targetId = params.target_id as string;
        const reason = params.reason as string;

        try {
            const { vetoId, severity } = await castVeto(
                agentId,
                targetType as 'proposal' | 'mission' | 'governance' | 'step',
                targetId,
                reason,
            );

            log.info('Veto cast via tool', {
                vetoId,
                agentId,
                targetType,
                targetId,
                severity,
            });

            return {
                success: true,
                veto_id: vetoId,
                severity,
                message:
                    severity === 'binding'
                        ? `Binding veto issued. The ${targetType} has been halted immediately.`
                        : `Soft veto issued. The ${targetType} has been flagged for review.`,
            };
        } catch (err) {
            const error = err as Error;
            log.error('Failed to cast veto', {
                error: error.message,
                agentId,
                targetType,
                targetId,
            });

            return {
                success: false,
                error: error.message,
                message: `Failed to cast veto: ${error.message}`,
            };
        }
    };
}

export const castVetoTool: NativeTool = {
    name: 'cast_veto',
    description:
        'Cast a veto on a proposal, mission, governance change, or step. ' +
        'Subrosa casts binding vetoes (immediate halt). Other agents cast soft vetoes (flags for review). ' +
        'Use this when you believe an action should be stopped or reviewed before proceeding.',
    agents: ['chora', 'subrosa', 'thaum', 'praxis', 'mux', 'primus'],
    parameters: {
        type: 'object',
        properties: {
            target_type: {
                type: 'string',
                enum: ['proposal', 'mission', 'governance', 'step'],
                description: 'The type of target to veto',
            },
            target_id: {
                type: 'string',
                description: 'The UUID of the target to veto',
            },
            reason: {
                type: 'string',
                description:
                    'Clear explanation of why this veto is being cast. Be specific about the concern.',
            },
        },
        required: ['target_type', 'target_id', 'reason'],
    },
    execute: createCastVetoExecute('system'),
};
