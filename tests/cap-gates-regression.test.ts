import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function readRepoFile(relativePath: string): string {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf8');
}

describe('mission cap gate regressions', () => {
    test('active mission cap ignores stale missions without active steps', () => {
        const source = readRepoFile('src/lib/ops/cap-gates.ts');

        expect(source).toContain('ACTIVE_MISSION_STATUSES');
        expect(source).toContain('ACTIVE_STEP_STATUSES');
        expect(source).toContain('MISSION_CAP_ACTIVE_STALE_HOURS');
        expect(source).toContain('mission_caps');
        expect(source).toContain('positiveNumberOrDefault');
        expect(source).toContain('Number.isFinite(parsed) && parsed > 0');
        expect(source).toContain('EXISTS (');
        expect(source).toContain('s.mission_id = ops_missions.id');
        expect(source).toContain('s.status = ANY');
        expect(source).toContain('updated_at >= NOW() -');
        expect(source).toContain('statuses=');
        expect(source).toContain('active_steps=');
        expect(source).toContain('stale_window_hours=');
    });

    test('daily step cap explicitly counts all attempted steps', () => {
        const source = readRepoFile('src/lib/ops/cap-gates.ts');

        expect(source).toContain('counts all attempted steps created today');
        expect(source).toContain('MISSION_CAP_MAX_DAILY_STEPS_PER_AGENT');
        expect(source).toContain('MAX_DAILY_STEPS_PER_AGENT');
    });
});
