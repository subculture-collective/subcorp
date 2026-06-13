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

        expect(triggers).toContain('validateDraftReviewPacket');
        expect(triggers).toContain('invalid_review_packet');
        expect(triggers).toContain('draft body must be at least');
        expect(triggers).toContain('status = \'needs_revision\'');
        expect(triggers).toContain('review_session_id IS NULL');
    });

    test('audit sessions require command evidence before success', () => {
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');

        expect(agentSession).toContain('detectAuditEvidenceIssues');
        expect(agentSession).toContain('audit evidence missing');
        expect(agentSession).toContain('STEP_TOOL_REQUIREMENTS[stepKind]');
    });
});
