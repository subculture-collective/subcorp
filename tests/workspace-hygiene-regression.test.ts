import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function readRepoFile(relativePath: string): string {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf8');
}

describe('workspace hygiene regressions', () => {
    test('file_read teaches correct workspace paths and rejects fake source assumptions', () => {
        const source = readRepoFile('src/lib/tools/tools/file-read.ts');

        expect(source).toContain('/workspace/projects is the product workspace root');
        expect(source).toContain('/workspace/projects/subcorp is the Subcorp source checkout');
        expect(source).toContain('Do not use /workspace/src');
        expect(source).toContain('pathHintForMissingWorkspacePath');
    });

    test('project registry tracks unmanaged nested git repositories', () => {
        const source = readRepoFile('src/lib/ops/projects.ts');

        expect(source).toContain('discoverNestedGitRepos');
        expect(source).toContain('unmanaged_nested_git_repos');
        expect(source).toContain("find /workspace/projects -mindepth 2 -maxdepth 2 -type d -name .git");
    });
});
