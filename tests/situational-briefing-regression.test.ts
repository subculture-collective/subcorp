import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

describe('situational briefing regressions', () => {
    test('pending proposals include stable ids to disambiguate duplicate titles', () => {
        const source = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/situational-briefing.ts'),
            'utf8',
        );

        expect(source).toContain('SELECT id, title, agent_id');
        expect(source).toContain('[id: ${p.id}]');
    });
});
