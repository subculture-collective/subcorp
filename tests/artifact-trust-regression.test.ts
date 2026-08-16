import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function readRepoFile(relativePath: string): string {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf8');
}

describe('artifact trust boundary regressions', () => {
    test('workspace artifact API labels raw files untrusted unless in trusted manifest', () => {
        const route = readRepoFile('src/app/api/ops/artifacts/route.ts');

        expect(route).toContain('TRUSTED_MANIFEST_PATH');
        expect(route).toContain('loadTrustedManifestEntries');
        expect(route).toContain('tail -n 2000');
        expect(route).toContain('sha256sum');
        expect(route).toContain('manifestEntry.sha256');
        expect(route).toContain('trustedFileWriteContentPreview');
        expect(route).toContain('createHash');
        expect(route).toContain('toolCallSha === sha256.toLowerCase()');
        expect(route).toContain('entry.agent_id !== session.agent_id');
        expect(route).toContain('args?.append === true');
        expect(route).toContain('STRICT_UUID_PATTERN');
        expect(route).toContain('FROM ops_agent_sessions');
        expect(route).toContain("parsed.trusted !== true || parsed.session_status !== 'succeeded'");
        expect(route).toContain("status: trusted ? 'trusted' : 'untrusted'");
        expect(route).toContain("trust_source: trusted ? 'trusted_manifest' : 'raw_workspace_file'");
        expect(route).toContain('session_id: manifestEntry?.session_id');
        expect(route).toContain('session_status: manifestEntry?.session_status');
    });

    test('agent sessions only append trusted manifest rows after success', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');

        expect(source).toContain("finalStatus === 'succeeded'");
        expect(source).toContain('appendSucceededFileWriteManifests');
        expect(source).toContain("session_status: 'succeeded'");
        expect(source).toContain('trusted: true');
        expect(source).toContain('createHash');
        expect(source).toContain('sha256');
    });

    test('agents cannot forge trusted manifest rows through file_write', () => {
        const fileWrite = readRepoFile('src/lib/tools/tools/file-write.ts');

        expect(fileWrite).toContain('shared\\/manifests(?:\\/|$)');
        expect(fileWrite).toContain('trusted artifact manifests are orchestrator-managed');
    });
});
