import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function readRepoFile(relativePath: string): string {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf8');
}

describe('review and audit preflight regressions', () => {
    test('content draft auto-review has a hard preflight gate', () => {
        const triggers = readRepoFile('src/lib/ops/triggers.ts');
        const contentPipeline = readRepoFile('src/lib/ops/content-pipeline.ts');
        const unifiedWorker = readRepoFile('scripts/unified-worker/index.ts');

        expect(triggers).toContain('validateDraftReviewPacket');
        expect(triggers).toContain('invalid_review_packet');
        expect(triggers).toContain('draft body must be at least');
        expect(triggers).toContain('status = \'needs_revision\'');
        expect(triggers).toContain('review_session_id IS NULL');
        expect(contentPipeline).toContain('buildReviewReadyDraftBody');
        expect(contentPipeline).toContain('source_session: ${args.sourceSessionId}');
        expect(contentPipeline).toContain('publish_target: content pipeline');
        expect(contentPipeline).toContain('reviewer_ask: Review for factual grounding');
        expect(unifiedWorker).toContain('buildReviewReadyDraftBody');
        expect(unifiedWorker).toContain('source_session: ${args.sourceSessionId}');
        expect(unifiedWorker).toContain('publish_target: content pipeline');
        expect(unifiedWorker).toContain('reviewer_ask: Review for factual grounding');
    });

    test('audit sessions require command evidence before success', () => {
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');

        expect(agentSession).toContain('detectAuditEvidenceIssues');
        expect(agentSession).toContain('audit evidence missing');
        expect(agentSession).toContain('containsBareWorkspaceAlias');
        expect(agentSession).toContain('audit path evidence invalid');
        expect(agentSession).toContain('audit_system outputs must use real /workspace/... paths');
        expect(agentSession).toContain('containsUnsupportedAuditEvidence');
        expect(agentSession).toContain('audit unsupported evidence invalid');
        expect(agentSession).toContain('no-issue/no-risk claims with bash output or hostAudit evidence');
        expect(agentSession).toContain('STEP_TOOL_REQUIREMENTS[stepKind]');
    });

    test('grounded artifact steps cannot succeed without Grounding sections', () => {
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');
        const stepPrompts = readRepoFile('src/lib/ops/step-prompts.ts');

        expect(agentSession).toContain('STEP_KINDS_REQUIRING_GROUNDED_ARTIFACTS');
        expect(agentSession).toContain('detectArtifactGroundingIssues');
        expect(agentSession).toContain('artifact grounding missing');
        expect(agentSession).toContain('grounded artifact steps must include a Grounding section');
        expect(agentSession).toContain('containsGroundingSection');
        expect(stepPrompts).toContain('Completion contract:');
        expect(stepPrompts).toContain('completionContract(kind)');
        expect(stepPrompts).toContain('MUST include a Grounding section');
        expect(stepPrompts).toContain('The artifact MUST include an evidence table');
    });
});
