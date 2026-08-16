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
        expect(patchPrompt).toContain('Project directory: /workspace/projects/product-sprint-design-and-buil');
        expect(patchPrompt).toContain('Do not write product files directly into /workspace/projects root');
        expect(patchPrompt).toContain('Run package-manager or scaffold commands only inside the project directory');
        expect(patchPrompt).toContain('Never run npm init from /workspace or /workspace/projects root');
        expect(patchPrompt).toContain('Do not assume /workspace/src exists');
        expect(patchPrompt).toContain('file_read accepts concrete files only, not directories');
        expect(patchPrompt).toContain('Use bash to list a directory and choose specific file paths before calling file_read');
        expect(patchPrompt).toContain('Artifact grounding rule');
        expect(patchPrompt).toContain('Include a "Grounding" section');
        expect(patchPrompt).toContain('If a claim is not verified, label it as a proposal, assumption, or next step');
        expect(auditPrompt).toContain('evidence table');
        expect(auditPrompt).toContain('ask Praxis to run the shell audit and publish the evidence table');
        expect(auditPrompt).toContain('Do not invent command output');
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
        expect(lessonPrompt).toContain('Do not invent inventories, system names, record counts, costs, dates, percentages, or operational metrics');
        expect(lessonPrompt).toContain('If source inventory/evidence is missing, state that explicitly');
        expect(specPrompt).toContain('Artifact grounding rule');
        expect(specPrompt).toContain('If a claim is not verified, label it as a proposal, assumption, or next step');
        expect(specPrompt).toContain('Product identity rule: the product name, audience, and core purpose come from the mission title and payload');
        expect(specPrompt).toContain('Do NOT replace the requested product with an unrelated governance, audit, or operations concept');
        expect(specPrompt).toContain('Use unrelated audit/process artifacts only as constraints, risks, or compliance requirements, not as the product concept');
    });

    test('self_evolution prompt has a writable fallback when /workspace is missing', async () => {
        const prompt = await buildStepPrompt('self_evolution', {
            missionTitle: 'Self-evolution: analyze issues and implement fixes',
            agentId: 'praxis',
            payload: {
                description: 'Implement the top improvement and open a PR.',
            },
        });

        expect(prompt).toContain('/workspace/projects/subcorp');
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
