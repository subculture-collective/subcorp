import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import { unsupportedHighRiskClaimLines } from '../src/lib/ops/claim-evidence';

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
        expect(agentSession).toContain('containsPlaceholderAuditEvidence');
        expect(agentSession).toContain('audit placeholder evidence invalid');
        expect(agentSession).toContain('generic parenthesized observed-output text');
        expect(agentSession).toContain('no-issue/no-risk claims with bash output or hostAudit evidence');
        expect(agentSession).toContain('STEP_TOOL_REQUIREMENTS[stepKind]');
    });

    test('grounded artifact steps cannot succeed without Grounding sections', () => {
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');
        const stepPrompts = readRepoFile('src/lib/ops/step-prompts.ts');

        expect(agentSession).toContain('STEP_KINDS_REQUIRING_GROUNDED_ARTIFACTS');
        expect(agentSession).toContain('detectArtifactGroundingIssues');
        expect(agentSession).toContain('artifact grounding missing');
        expect(agentSession).toContain('artifact grounding weak');
        expect(agentSession).toContain('containsWeakGroundingSection');
        expect(agentSession).toContain('grounded artifact steps must include a Grounding section');
        expect(agentSession).toContain('Source Artifact: None / Commands Used: None is not sufficient');
        expect(agentSession).toContain('containsGroundingSection');
        expect(agentSession).toContain('^\\*\\*Grounding:?\\*\\*');
        expect(stepPrompts).toContain('Completion contract:');
        expect(stepPrompts).toContain('completionContract(kind, ctx.agentId)');
        expect(stepPrompts).toContain('MUST include a Grounding section');
        expect(stepPrompts).toContain('The artifact MUST include an evidence table');
    });

    test('grounded artifacts reject placeholder evidence and missing cited sources', () => {
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');
        const stepPrompts = readRepoFile('src/lib/ops/step-prompts.ts');

        expect(agentSession).toContain('invalidGroundingIssues');
        expect(agentSession).toContain('artifact grounding invalid');
        expect(agentSession).toContain('containsPlaceholderEvidenceUrl');
        expect(agentSession).toContain('example\\.com|example\\.org|example\\.net');
        expect(agentSession).not.toContain('example\\.com|example\\.org|example\\.net|localhost|127');
        expect(agentSession).toContain('containsMissingSourceMarker');
        expect(agentSession).toContain('file not found|not found|unavailable|inaccessible|could not read|assumption made|assumed missing');
        expect(stepPrompts).toContain('Do not cite example.com/placeholder URLs or files marked missing/not found as evidence');
    });

    test('grounding validation uses latest successful artifact write per path', () => {
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');

        expect(agentSession).toContain('artifactWritesByPath');
        expect(agentSession).toContain('artifactWritesByPath.set(normalizedPath, tc)');
        expect(agentSession).toContain('const artifactWrites = [...artifactWritesByPath.values()]');
        expect(agentSession).toContain('normalizeWorkspaceRelativePath(path)');
    });

    test('product spec metrics must distinguish proposed targets from verified outcomes', () => {
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');
        const stepPrompts = readRepoFile('src/lib/ops/step-prompts.ts');

        expect(agentSession).toContain('containsUnverifiedProductSpecMetric');
        expect(agentSession).toContain('product spec success metric is framed as verified/completed outcome instead of target/proposed metric');
        expect(agentSession).toContain('target|proposed|goal|aim|planned|candidate|success metric|should|will');
        expect(agentSession).toContain('verified|observed|achieved|completed|implemented|approved|documented|resolved|delivered');
        expect(stepPrompts).toContain('Success metrics must be labelled as targets/proposed metrics unless backed by verified evidence');
    });

    test('grounded artifacts flag high-risk factual claims without explicit evidence', () => {
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');

        expect(agentSession).toContain('high-risk factual claim lacks explicit evidence or hypothesis/target framing');
        expect(agentSession).toContain('unsupportedHighRiskClaimLines');
        expect(readRepoFile('src/lib/ops/claim-evidence.ts')).toContain('GDPR|CCPA|SOC');
        expect(readRepoFile('src/lib/ops/claim-evidence.ts')).toContain('verified|observed|achieved|completed|implemented');
        expect(readRepoFile('src/lib/ops/claim-evidence.ts')).toContain('target|proposed|proposal|hypothesis');
    });

    test('high-risk claim detection is line-level and ignores grounding references', () => {
        expect(unsupportedHighRiskClaimLines(`## Grounding\n- src/lib/ops/execution-evidence.ts\n\n## Notes\nThe target is 95% audit coverage.`)).toEqual([]);
        expect(unsupportedHighRiskClaimLines(`## Grounding\n- file_read src/foo.ts\n\n## Claims\nThe system is SOC 2 compliant and costs were reduced by 50%.`)).toEqual([
            'The system is SOC 2 compliant and costs were reduced by 50%.',
        ]);
        expect(unsupportedHighRiskClaimLines(`Implemented encryption per file_read src/security.ts.`)).toEqual([]);
        expect(unsupportedHighRiskClaimLines(`## Security\n\nDetails to follow.`)).toEqual([]);
        expect(unsupportedHighRiskClaimLines(`**Grounding:**\n- file_read src/foo.ts\n\nThe system is SOC 2 compliant and costs were reduced by 50%.`)).toEqual([
            'The system is SOC 2 compliant and costs were reduced by 50%.',
        ]);
        expect(unsupportedHighRiskClaimLines(`## Grounding\n\nSecurity review notes.`)).toEqual([]);
    });
});
