import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

describe('operational observability regressions', () => {
    test('LLM empty text has a prometheus counter', () => {
        const metrics = fs.readFileSync(path.join(WORKSPACE_ROOT, 'src/lib/metrics.ts'), 'utf8');
        const llm = fs.readFileSync(path.join(WORKSPACE_ROOT, 'src/lib/llm/client.ts'), 'utf8');

        expect(metrics).toContain('subcorp_llm_empty_text_total');
        expect(llm).toContain('incLlmEmptyText');
    });

    test('heartbeat runs workspace world-writable permission check', () => {
        const heartbeat = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/app/api/ops/heartbeat/route.ts'),
            'utf8',
        );
        const checker = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/workspace-permissions.ts'),
            'utf8',
        );
        const metrics = fs.readFileSync(path.join(WORKSPACE_ROOT, 'src/lib/metrics.ts'), 'utf8');

        expect(heartbeat).toContain('checkWorkspaceWorldWritableFiles');
        expect(checker).toContain('find /workspace -type f -perm -0002');
        expect(metrics).toContain('subcorp_workspace_world_writable_files_total');
    });
});
