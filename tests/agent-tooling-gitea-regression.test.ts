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
        expect(source).not.toContain('appendManifest(');
        expect(source).not.toContain('index.jsonl');
    });

    test('file_write blocks project root product and misplaced agent paths', () => {
        const source = readRepoFile('src/lib/tools/tools/file-write.ts');

        expect(source).toContain('forbiddenWorkspaceProjectRootWritePath');
        expect(source).toContain('workspace_project_root_boundary');
        expect(source).toContain('not be placed under /workspace/output/projects');
        expect(source).toContain('not /workspace/projects root');
        expect(source).toContain('not /workspace/projects/agents');
        expect(source).toContain('output\\/projects\\/');
        expect(source).toContain('package\\.json|README\\.md|app\\.py');
    });

    test('bash blocks project root scaffold writes', () => {
        const source = readRepoFile('src/lib/tools/tools/bash.ts');

        expect(source).toContain('forbiddenWorkspaceRootWriteCommand');
        expect(source).toContain('workspace_project_root_boundary');
        expect(source).toContain('npm init must run inside a mission-specific /workspace/projects/<slug> directory');
        expect(source).toContain('not /workspace/projects root');
        expect(source).toContain('package\\.json|README\\.md|app\\.py');
    });

    test('cast_veto rejects file-path targets before database writes', () => {
        const source = readRepoFile('src/lib/tools/tools/cast-veto.ts');

        expect(source).toContain('invalidVetoTargetReason');
        expect(source).toContain('VETO_TARGET_TYPES');
        expect(source).toContain('UUID_PATTERN');
        expect(source).toContain('use send_to_agent for file review requests');
        expect(source).toContain('do not pass file paths or filenames');
        expect(source).toContain('veto_target_uuid_required');
        expect(source).toContain('Rejected invalid veto target before database write');
    });

    test('agent sessions publish output manifests only after succeeded completion', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');

        expect(source).toContain('finalStatus === \'succeeded\'');
        expect(source).toContain('appendSucceededFileWriteManifests');
        expect(source).toContain('session_status: \'succeeded\'');
        expect(source).toContain('trusted: true');
        expect(source).toContain('published_at');
        expect(source).toContain('/workspace/shared/manifests/index.jsonl');
    });

    test('agent sessions retry text-only answers that miss required tool contracts', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');

        expect(source).toContain('retriedMissingToolContract');
        expect(source).toContain('missingRequiredToolNamesForSession');
        expect(source).toContain('Your previous response did not satisfy the required tool contract');
        expect(source).toContain('Do not describe commands or file contents as prose instead of using the tools');
    });

    test('agent sessions do not require unavailable tools from non-writer agents', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');
        const prompts = readRepoFile('src/lib/ops/step-prompts.ts');

        expect(source).toContain('filterUnavailableToolRequirements');
        expect(source).toContain('availableToolNamesForSession');
        expect(source).toContain("availableTools.has('bash') && availableTools.has('file_write')");
        expect(source).toContain("'send_to_agent'");
        expect(prompts).toContain('this agent cannot publish workspace artifacts directly');
        expect(prompts).toContain('this agent cannot run shell checks directly');
        expect(prompts).toContain('adaptBodyForAgentTools');
    });

    test('generic grounding guidance does not make web_fetch mandatory', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');

        expect(source).toContain("requiresExplicitTool(prompt, 'web_fetch')");
        expect(source).toContain('requiresExplicitTool');
        expect(source).not.toContain("if (/\\bweb_fetch\\b/.test(text))");
    });

    test('optional memory_write guidance does not make memory writes mandatory', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');
        const prompts = readRepoFile('src/lib/ops/step-prompts.ts');

        expect(source).toContain("requiresExplicitTool(prompt, 'memory_write')");
        expect(source).toContain("!mentionsOptionalTool(prompt, 'memory_write')");
        expect(source).toContain('mentionsOptionalTool');
        expect(source).not.toContain("if (/\\bmemory_write\\b/.test(text))");
        expect(prompts).toContain('optionally use memory_write');
    });

    test('worker reaps expired running agent sessions before polling new work', () => {
        const worker = readRepoFile('scripts/unified-worker/index.ts');

        expect(worker).toContain('reapExpiredRunningAgentSessions');
        expect(worker).toContain('running session exceeded timeout_seconds');
        expect(worker).toContain('NOW() - started_at > make_interval(secs => timeout_seconds)');
        expect(worker.indexOf('await reapExpiredRunningAgentSessions();')).toBeLessThan(
            worker.indexOf('SELECT id FROM ops_agent_sessions')
        );
    });

    test('worker finalizes running steps from terminal sessions without direct links', () => {
        const worker = readRepoFile('scripts/unified-worker/index.ts');
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');

        expect(worker).toContain('finalizeMissionSteps');
        expect(worker).toContain('LEFT JOIN LATERAL');
        expect(worker).toContain("candidate.source = 'mission'");
        expect(worker).toContain("candidate.source_id = s.mission_id::text");
        expect(worker).toContain("candidate.result->>'mission_step_id' = s.id::text");
        expect(worker).toContain("candidate.status IN ('succeeded', 'blocked', 'failed', 'timed_out')");
        expect(worker).toContain('SELECT COUNT(*) FROM ops_agent_sessions terminal');
        expect(worker).toContain('SELECT COUNT(*) FROM ops_mission_steps unmatched');
        expect(worker).toContain("live.status IN ('pending', 'running')");
        expect(worker).toContain("live.source = 'mission'");
        expect(worker).toContain("'reconciledBy', 'worker-finalizer'");
        expect(worker).toContain('agentSessionId: step.session_id');
        expect(worker).toContain("recoverSweptFailure: step.step_status === 'failed'");
        expect(worker).toContain("mission_step_id: step.id");
        expect(worker).toContain("session.id::text = step.result->>'agent_session_id'");
        expect(agentSession).toContain("result = COALESCE(result, '{}'::jsonb) ||");
        expect(worker).not.toContain('agentSessionId: undefined');
    });

    test('empty no-tool mission sessions cannot be marked succeeded', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');

        expect(source).toContain('detectEmptySessionOutcome');
        expect(source).toContain('empty session output');
        expect(source).toContain('no final text and no successful tool calls');
        expect(source).toContain('emptySessionOutcome.blocked');
    });

    test('successful durable handoffs count as artifact delivery after recoverable tool errors', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');

        expect(source).toContain('hasSuccessfulArtifactDelivery');
        expect(source).toContain("tc.name !== 'send_to_agent'");
        expect(source).toContain("tc.name !== 'scratchpad_update'");
        expect(source).toContain("tc.name !== 'memory_write'");
        expect(source).toContain('fatalToolErrors.length > 0 && !hasSuccessfulArtifactDelivery');
        expect(source).toContain('Fatal tool error without successful artifact delivery');
    });

    test('autonomous agent bash sessions cannot publish git changes', () => {
        const bashTool = readRepoFile('src/lib/tools/tools/bash.ts');
        const prompts = readRepoFile('src/lib/ops/step-prompts.ts');

        expect(bashTool).toContain('forbiddenAutonomousPublishCommand');
        expect(bashTool).toContain('git commit is disabled for autonomous agent bash sessions');
        expect(bashTool).toContain('git push is disabled for autonomous agent bash sessions');
        expect(bashTool).toContain('pull request creation is disabled for autonomous agent bash sessions');
        expect(bashTool).toContain('denied: true');

        expect(prompts).toContain('MUST NOT commit, push, or create live PRs');
        expect(prompts).toContain('PR-ready summary artifact');
        expect(prompts).toContain('Do not run git commit, git push, gh/tea PR creation');
        expect(prompts).not.toContain('git commit -m');
        expect(prompts).not.toContain('git push -u origin');
    });

    test('direct workspace writers normalize artifact permissions', () => {
        expect(readRepoFile('src/lib/tools/tools/send-to-agent.ts')).toContain('chmod 0644');
        expect(readRepoFile('src/lib/tools/tools/spawn-droid.ts')).toContain('chmod 0644');
        expect(readRepoFile('src/lib/ops/projects.ts')).toContain('chmod 0644');
        expect(readRepoFile('src/lib/ops/newspaper.ts')).toContain('mode: 0o644');
        expect(readRepoFile('src/lib/ops/newsletter.ts')).toContain('mode: 0o644');
        expect(readRepoFile('src/lib/ops/content-publication.ts')).toContain('mode: 0o644');
    });

    test('droids do not receive raw bash access that bypasses file_write ACLs', () => {
        const registry = readRepoFile('src/lib/tools/registry.ts');
        const spawnDroid = readRepoFile('src/lib/tools/tools/spawn-droid.ts');
        const prompts = readRepoFile('src/lib/ops/step-prompts.ts');

        expect(registry).toContain("const droidToolNames = ['file_read', 'file_write', 'web_search', 'web_fetch']");
        expect(registry).toContain('They intentionally do not get raw bash because shell redirection can bypass file_write ACLs');
        expect(spawnDroid).not.toContain('You can use bash and web_search as needed');
        expect(spawnDroid).toContain('You cannot use bash or shell redirection');
        expect(spawnDroid).toContain('invalidDroidTaskReason');
        expect(spawnDroid).toContain('captcha solver');
        expect(spawnDroid).toContain('droid tasks cannot solve or bypass CAPTCHA-gated sources');
        expect(spawnDroid).toContain('explore|survey|list|enumerate|walk|map|scan');
        expect(spawnDroid).toContain('recursively|recursive|entire|tree|directory|directories|every file|all files');
        expect(spawnDroid).toContain('droid tasks cannot recursively list /workspace/projects because droids have no directory listing tool');
        expect(spawnDroid).toContain('shell audit');
        expect(spawnDroid).toContain('run shell');
        expect(spawnDroid).toContain('droid tasks cannot require bash, shell audit, shell commands, or shell redirection');
        expect(spawnDroid).toContain('add|update|rewrite|patch|fix|implement');
        expect(spawnDroid).toContain('droid tasks cannot modify /workspace/output, /workspace/projects, or /workspace/agents paths');
        expect(spawnDroid).toContain('droid tasks cannot write outside their droids/<id>/ workspace');
        expect(spawnDroid).toContain('droid_workspace_boundary');
        expect(spawnDroid).toContain('Do not cite, summarize, or use the droid output as evidence until check_droid returns status=succeeded with output_preview');
        expect(spawnDroid).toContain('evidence_ready: false');
        expect(spawnDroid).toContain('do not cite or depend on ${outputPath} until check_droid returns status=succeeded with output_preview');
        expect(prompts).toContain('function agentCanUseShell');
        expect(prompts).not.toContain("return SHELL_AGENTS.has(agentId) || agentId.startsWith('droid-')");
    });

    test('droid final artifacts cannot be tiny pointer-only placeholders', () => {
        const source = readRepoFile('src/lib/tools/agent-session.ts');
        const fileWrite = readRepoFile('src/lib/tools/tools/file-write.ts');

        expect(source).toContain('detectDroidPlaceholderArtifact');
        expect(source).toContain('droid placeholder artifact');
        expect(source).toContain('normalizeWorkspaceRelativePath');
        expect(source).toContain("path.startsWith('/workspace/')");
        expect(source).toContain('isPointerOnlyDroidArtifact');
        expect(source).toContain('isDroidFinalArtifactPath');
        expect(source).toContain("typeof session.result?.output_path === 'string'");
        expect(source).toContain('content.trim().length >= 120');
        expect(fileWrite).toContain("agentId.startsWith('droid-')");
        expect(fileWrite).toContain('relativePath.startsWith(`${DROID_PREFIX}${agentId}/`)');
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

    test('llama-line broker calls are monitored and terminal SSE errors include details', () => {
        const source = readRepoFile('src/lib/llm/client.ts');

        expect(source).toContain('LLAMA_LINE_STATUS_WARN_QUEUE_DEPTH');
        expect(source).toContain('/broker/status');
        expect(source).toContain('llama-line broker status before request');
        expect(source).toContain('llama-line request queued');
        expect(source).toContain('request_id=');
        expect(source).toContain("contentType.includes('application/json')");
        expect(source).toContain('ollama_unavailable');
        expect(source).toContain('dropped_by_admin');
    });

    test('malformed tool calls fail before executing tools with missing required args', () => {
        const source = readRepoFile('src/lib/llm/client.ts');
        const agentSession = readRepoFile('src/lib/tools/agent-session.ts');

        expect(source).toContain('missingRequiredToolArgs');
        expect(source).toContain('Invalid tool arguments: missing required parameter(s)');
        expect(source).toContain('Ollama tool call missing required args');
        expect(agentSession).toContain('/invalid tool arguments/i');
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
        expect(source).toContain('GITEA_WORKSPACE_ORG');
        expect(source).toContain('GITEA_PROJECT_ORG');
        expect(source).toContain('GITEA_WORKSPACE_TOKEN or GITEA_TOKEN is required');
        expect(source).toContain('should_skip_project_dir');
        expect(source).toContain('agents|app|core|db|deploy|docker|docs|drift_report');
        expect(source).toContain('sync_workspace');
        expect(source).toContain('sync_projects');
        expect(source).toContain('rsync -a --no-owner --no-group --delete');
        expect(source).toContain('--delete-excluded');
        expect(source).toContain("'projects/'");
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
        expect(source).toContain('remote add origin "$(remote_url "$owner" "$repo")"');
        expect(source).toContain('sync_sanitized_source "$project_dir" "$GITEA_PROJECT_ORG"');
        expect(dockerfile).toContain('sync-workspace-to-gitea.sh');
    });

    test('tooling migration does not broaden auto-approval for self-modifying Gitea steps', () => {
        const migration = readRepoFile('db/migrations/028_agent_tooling_gitea.sql');

        expect(migration).toContain('ops_step_templates');
        expect(migration.includes('allowed_step_kinds')).toBe(false);
        expect(migration.includes('self_evolution"]')).toBe(false);
    });

    test('workspace owner split migration preserves patch prompt safety guidance', () => {
        const migration = readRepoFile('db/migrations/032_workspace_gitea_owner_split.sql');

        expect(migration).toContain('/workspace/output is the artifact output root');
        expect(migration).toContain('file_read accepts concrete files only, not directories');
        expect(migration).toContain('Artifact grounding rule');
        expect(migration).toContain('Include a "Grounding" section');
        expect(migration).toContain('A summary without file_write evidence is incomplete');
    });
});
