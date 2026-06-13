import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function readRepoFile(relativePath: string): string {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf8');
}

describe('agent tool execution regressions', () => {
    test('mission code sessions cannot succeed without successful file_write evidence', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');

        expect(source).toContain('STEP_TOOL_REQUIREMENTS');
        expect(source).toContain("patch_code: { allOf: ['file_write'] }");
        expect(source).toContain('detectMissingRequiredToolEvidence');
        expect(source).toContain('exitCode !== 0');
        expect(source).toContain('Required tool evidence missing');
        expect(source).toContain('missingToolEvidence.blocked');
        expect(source).toContain("finalStatus =\n            blockedOutcome.blocked || missingToolEvidence.blocked");
    });

    test('file_write normalizes artifact permissions after writes', () => {
        const source = readRepoFile('src/lib/tools/tools/file-write.ts');

        expect(source).toContain("chmod 0644");
    });

    test('direct workspace writers normalize artifact permissions', () => {
        expect(readRepoFile('src/lib/tools/tools/send-to-agent.ts')).toContain('chmod 0644');
        expect(readRepoFile('src/lib/tools/tools/spawn-droid.ts')).toContain('chmod 0644');
        expect(readRepoFile('src/lib/ops/projects.ts')).toContain('chmod 0644');
        expect(readRepoFile('src/lib/ops/newspaper.ts')).toContain('mode: 0o644');
        expect(readRepoFile('src/lib/ops/newsletter.ts')).toContain('mode: 0o644');
        expect(readRepoFile('src/lib/ops/content-publication.ts')).toContain('mode: 0o644');
    });

    test('ollama text tool calls are recovered before accepting text-only success', () => {
        const source = readRepoFile('src/lib/llm/client.ts');

        expect(source).toContain('Recovered Ollama tool calls from DSML text');
        expect(source).toContain('parseDsmlToolCalls(raw, tools)');

        const recoveryIndex = source.indexOf('parseDsmlToolCalls(raw, tools)');
        const textOnlyIndex = source.indexOf('// No tool calls → return text');
        expect(recoveryIndex >= 0).toBe(true);
        expect(textOnlyIndex >= 0).toBe(true);
        expect(recoveryIndex < textOnlyIndex).toBe(true);
    });

    test('tool requests are routed to a local Ollama model, not openai-prefixed harness routes', () => {
        const source = readRepoFile('src/lib/llm/client.ts');
        const envExample = readRepoFile('.env.example');

        expect(source).toContain('OLLAMA_TOOL_MODEL');
        expect(source).toContain('resolveOllamaModelForToolRequest');
        expect(source).toContain('Ignoring non-local OLLAMA_TOOL_MODEL for tool execution');
        expect(source).toContain('Routing tool request away from llama-line OpenCode harness model');
        expect(source).toContain('const preferOllamaFirst = hasTools || shouldTryOllamaFirst(resolvedModel);');
        expect(source).toContain('const preferredModel = resolvePreferredOllamaModel(options?.model, hasTools);');
        expect(envExample).toContain('OLLAMA_TOOL_MODEL=qwen3:14b');
    });

    test('local Ollama tool loops have enough total budget for multi-round work', () => {
        const source = readRepoFile('src/lib/llm/client.ts');

        expect(source).toContain('const LLM_TOOL_TOTAL_BUDGET_MS = 240_000;');
        expect(source).toContain('90s caused healthy multi-tool sessions to be cut off and blocked');
    });
});

describe('Gitea workspace push regressions', () => {
    test('toolbox initializes tokenless Gitea remotes through askpass', () => {
        const source = readRepoFile('docker/toolbox/init-workspace.sh');

        expect(source).toContain('GITEA_TOKEN');
        expect(source).toContain('gitea-askpass');
        expect(source).toContain('git remote add origin "${GITEA_BASE_URL}/${GITEA_ORG}/subcorp.git"');
        expect(source.includes('x-access-token:${GITHUB_TOKEN}@')).toBe(false);
    });

    test('toolbox workspace init does not make artifacts world-writable', () => {
        const source = readRepoFile('docker/toolbox/init-workspace.sh');

        expect(source).toContain('umask 0022');
        expect(source).toContain('chown -R 1001:1001 /workspace');
        expect(source).toContain('chmod -R u+rwX,g+rwX,o+rX,o-w /workspace');
        expect(source.includes('umask 0000')).toBe(false);
        expect(source.includes('chmod -R a+rwX /workspace')).toBe(false);
    });

    test('workspace sync script pushes snapshot and individual projects to Gitea', () => {
        const source = readRepoFile('docker/toolbox/sync-workspace-to-gitea.sh');
        const dockerfile = readRepoFile('docker/toolbox/Dockerfile');

        expect(source).toContain('GITEA_WORKSPACE_REPO');
        expect(source).toContain('sync_workspace');
        expect(source).toContain('sync_projects');
        expect(source).toContain('rsync -a --delete');
        expect(source).toContain('--delete-excluded');
        expect(source).toContain("--filter='P /.git/'");
        expect(source).toContain("--exclude='.git'");
        expect(source).toContain("nested Git metadata found");
        expect(source).toContain('assert_no_sensitive_files');
        expect(source).toContain('git_add_safely');
        expect(source).toContain('git -C "$dir" add -u');
        expect(source).toContain("'.npmrc'");
        expect(source).toContain("'*.key'");
        expect(source).toContain('sync_sanitized_source "$project_dir"');
        expect(source).toContain('/workspace/projects');
        expect(source).toContain('remote add origin "$(remote_url "$repo")"');
        expect(dockerfile).toContain('sync-workspace-to-gitea.sh');
    });

    test('tooling migration does not broaden auto-approval for self-modifying Gitea steps', () => {
        const migration = readRepoFile('db/migrations/028_agent_tooling_gitea.sql');

        expect(migration).toContain('ops_step_templates');
        expect(migration.includes('allowed_step_kinds')).toBe(false);
        expect(migration.includes('self_evolution"]')).toBe(false);
    });
});
