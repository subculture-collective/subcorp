import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function readRepoFile(relativePath: string): string {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf8');
}

describe('execution evidence regressions', () => {
    test('successful sessions do not automatically pass acceptance criteria', () => {
        const source = readRepoFile('src/lib/ops/execution-evidence.ts');

        expect(source).toContain('Session succeeded, but acceptance criteria require explicit validator evidence');
        expect(source).toContain("outcome === 'dispatched' ? 'pending'");
        expect(source).toContain(": 'not_verified'");
        expect(source).not.toContain("outcome === 'succeeded' ? 'passed'");
    });
});
