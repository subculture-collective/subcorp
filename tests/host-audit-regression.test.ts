import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('host-aware audit helper', () => {
    test('host audit helper labels host and toolbox scopes separately', () => {
        const source = read('src/lib/ops/host-audit.ts');
        expect(source).toContain("scope: 'host'");
        expect(source).toContain("scope: 'toolbox'");
        expect(source).toContain('docker run --rm --network host');
        expect(source).toContain('ss -ltnup');
    });

    test('heartbeat includes host audit as non-fatal diagnostics', () => {
        const heartbeat = read('src/app/api/ops/heartbeat/route.ts');
        expect(heartbeat).toContain('checkHostAuditSnapshot');
        expect(heartbeat).toContain('results.hostAudit');
        expect(heartbeat).toContain('Host audit snapshot failed');
    });
});
