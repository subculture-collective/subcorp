import { describe, expect, test } from 'bun:test';

import { buildStepPrompt } from '@/lib/ops/step-prompts';

describe('step prompt regressions', () => {
    test('prompts ground agents in real workspace source paths', async () => {
        const patchPrompt = await buildStepPrompt('patch_code', {
            missionTitle: 'Product sprint: design and build',
            agentId: 'praxis',
            payload: { description: 'Build the next product feature.' },
        });
        const auditPrompt = await buildStepPrompt('audit_system', {
            missionTitle: 'Operational status report',
            agentId: 'subrosa',
            payload: { description: 'Audit runtime state.' },
        });

        expect(patchPrompt).toContain('/workspace/projects is the product workspace root');
        expect(patchPrompt).toContain('/workspace/projects/subcorp is the Subcorp source checkout');
        expect(patchPrompt).toContain('Do not assume /workspace/src exists');
        expect(auditPrompt).toContain('evidence table');
        expect(auditPrompt).toContain('Do not claim exposed ports, services, or permissions without command output');
    });

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
