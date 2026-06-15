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
        expect(auditPrompt).toContain('/workspace/output is the artifact output root');
        expect(auditPrompt).toContain('Do not use bare /output, /agents, or /projects paths');
        expect(patchPrompt).toContain('/workspace/projects/subcorp is the Subcorp source checkout');
        expect(patchPrompt).toContain('Do not assume /workspace/src exists');
        expect(patchPrompt).toContain('file_read accepts concrete files only, not directories');
        expect(patchPrompt).toContain('Use bash to list a directory and choose specific file paths before calling file_read');
        expect(patchPrompt).toContain('Artifact grounding rule');
        expect(patchPrompt).toContain('Include a "Grounding" section');
        expect(patchPrompt).toContain('If a claim is not verified, label it as a proposal, assumption, or next step');
        expect(auditPrompt).toContain('evidence table');
        expect(auditPrompt).toContain('Commands must inspect real /workspace/... paths');
        expect(auditPrompt).toContain('Do not claim exposed ports, services, files, artifacts, or permissions without command output');
    });

    test('documentation/spec prompts require grounded claims', async () => {
        const lessonPrompt = await buildStepPrompt('document_lesson', {
            missionTitle: 'Log milestone completion',
            agentId: 'praxis',
            payload: { description: 'Document the milestone.' },
        });
        const specPrompt = await buildStepPrompt('draft_product_spec', {
            missionTitle: 'Draft next product spec',
            agentId: 'primus',
            payload: { description: 'Draft a spec.' },
        });

        expect(lessonPrompt).toContain('Artifact grounding rule');
        expect(lessonPrompt).toContain('do not claim code changes, schema changes, metrics, coverage, compliance, operational outcomes, or completed work unless you verified them');
        expect(lessonPrompt).toContain('Include a "Grounding" section');
        expect(specPrompt).toContain('Artifact grounding rule');
        expect(specPrompt).toContain('If a claim is not verified, label it as a proposal, assumption, or next step');
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
        expect(prompt).toContain('Artifact grounding rule');
        expect(prompt).toContain('Include a "Grounding" section');
    });

    test('log_event prompt requires grounded event facts', async () => {
        const prompt = await buildStepPrompt('log_event', {
            missionTitle: 'Convene daily roundtable',
            agentId: 'mux',
            payload: { event: 'roundtable' },
            outputPath: 'agents/mux/notes',
        });

        expect(prompt).toContain('Artifact grounding rule');
        expect(prompt).toContain('Include a "Grounding" section');
    });
});
