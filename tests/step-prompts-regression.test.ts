import { describe, expect, test } from 'bun:test';

import { buildStepPrompt } from '@/lib/ops/step-prompts';

describe('step prompt regressions', () => {
    test('self_evolution prompt has a writable fallback when /workspace is missing', async () => {
        const prompt = await buildStepPrompt('self_evolution', {
            missionTitle: 'Self-evolution: analyze issues and implement fixes',
            agentId: 'praxis',
            payload: {
                description: 'Implement the top improvement and open a PR.',
            },
        });

        expect(prompt).toContain('REPO_DIR=/workspace/projects/subcorp');
        expect(prompt).toContain('/home/onnwee/projects/subcorp');
        expect(prompt).toContain('git clone https://git.subcult.tv/subculture-collective/subcorp.git /home/onnwee/projects/subcorp');
        expect(prompt).toContain('cd "$REPO_DIR"');
    });
});
