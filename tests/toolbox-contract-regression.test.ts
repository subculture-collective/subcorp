import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('toolbox helper command contract', () => {
    test('toolbox image installs sync-workspace-to-gitea in /usr/local/bin', () => {
        const dockerfile = read('docker/toolbox/Dockerfile');
        expect(dockerfile).toContain('COPY docker/toolbox/sync-workspace-to-gitea.sh /usr/local/bin/sync-workspace-to-gitea.sh');
        expect(dockerfile).toContain('chmod +x /usr/local/bin/init-workspace.sh /usr/local/bin/sync-workspace-to-gitea.sh');
    });

    test('workspace shell PATH includes /usr/local/bin for agent commands', () => {
        const init = read('docker/toolbox/init-workspace.sh');
        expect(init).toContain('export PATH="/usr/local/bin:$PATH"');
        expect(init).toContain('sync-workspace-to-gitea.sh');
    });

    test('bash tool description names exact sync command path', () => {
        const bashTool = read('src/lib/tools/tools/bash.ts');
        expect(bashTool).toContain('/usr/local/bin/sync-workspace-to-gitea.sh');
        expect(bashTool).toContain('Host audit commands must be explicitly labelled');
    });
});
