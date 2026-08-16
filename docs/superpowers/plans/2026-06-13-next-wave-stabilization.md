# Next Wave Stabilization Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Recommended path:
> dispatch a fresh subagent per task, review each result with `review-quality`,
> then continue. For complex multi-agent splits, use
> `parallel-feature-development`, `team-composition-patterns`, and
> `team-communication-protocols`. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Remove the main post-hardening bottlenecks: missing toolbox commands, container-vs-host audit confusion, noisy empty LLM rounds, research rate-limit degradation, and stale-session ambiguity.

**Architecture:** Keep this as a stabilization wave, not a feature expansion. Prefer testable helpers and prompt/tool-contract fixes over large refactors. Each task has an independent verification path and can be committed separately.

**Tech Stack:** Next.js 16, TypeScript 5.9, Bun tests, Docker Compose, Debian toolbox, Prometheus `prom-client`, PostgreSQL 16.

---

## File Structure

- `docker/toolbox/Dockerfile` — ensure operational helper scripts are installed in the toolbox image and PATH is stable.
- `docker/toolbox/init-workspace.sh` — enforce workspace permissions at startup and make helper command discovery obvious to agents.
- `docker/toolbox/sync-workspace-to-gitea.sh` — verify executable helper already copied into `/usr/local/bin`.
- `src/lib/tools/tools/bash.ts` — add explicit command contract hints so agents use `/usr/local/bin/sync-workspace-to-gitea.sh` and host-aware audit commands correctly.
- `src/lib/ops/workspace-permissions.ts` — improve permission check to normalize expected git hook samples or classify them separately.
- `src/lib/ops/host-audit.ts` — new host/container audit helper that runs host-level checks via Docker socket when available and labels scope.
- `src/app/api/ops/heartbeat/route.ts` — include host audit summary in heartbeat diagnostics without making heartbeat fail.
- `src/lib/metrics.ts` — add counters for recovered empty-tool rounds, stale sweeps, and search fallback if not already present.
- `src/lib/llm/client.ts` — reduce empty-text noise by treating tool-only rounds as expected and counting actual unrecovered empty finals.
- `src/lib/tools/agent-session.ts` — capture empty-round recovery and terminal stale-sweep reasons in session metadata.
- `src/lib/tools/tools/web-search.ts` — expose Brave fallback counters and clearer result provenance.
- `tests/toolbox-contract-regression.test.ts` — source/static tests for toolbox helper availability and command contract.
- `tests/host-audit-regression.test.ts` — tests for audit scope labels and heartbeat integration.
- `tests/llm-empty-round-regression.test.ts` — source tests for metric and recovery semantics.
- `tests/search-fallback-regression.test.ts` — tests for search fallback metric/provenance.
- `docs/OBSERVE_TUNE_LOG.md` — append one cycle entry after deployment.

---

## Task 1: Toolbox helper contract and PATH stability

**Files:**
- Modify: `docker/toolbox/Dockerfile:94-103`
- Modify: `docker/toolbox/init-workspace.sh:25-35`
- Modify: `src/lib/tools/tools/bash.ts:5-18`
- Create: `tests/toolbox-contract-regression.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/toolbox-contract-regression.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test tests/toolbox-contract-regression.test.ts
```

Expected: FAIL because `init-workspace.sh` does not export PATH or mention the sync helper, and `bash.ts` does not include the exact command path/host-audit warning.

- [ ] **Step 3: Update toolbox startup environment**

In `docker/toolbox/init-workspace.sh`, replace the `/etc/workspace-env.sh` block at lines 25-29 with:

```bash
cat > /etc/workspace-env.sh << 'ENVSH'
umask 0022
export PATH="/usr/local/bin:$PATH"
export GIT_ASKPASS=/usr/local/bin/gitea-askpass
export GIT_TERMINAL_PROMPT=0
ENVSH
```

After the global git config block, add:

```bash
if command -v sync-workspace-to-gitea.sh >/dev/null 2>&1; then
    echo "Workspace sync helper available: /usr/local/bin/sync-workspace-to-gitea.sh"
else
    echo "Warning: sync-workspace-to-gitea.sh is missing from PATH" >&2
fi
```

- [ ] **Step 4: Update bash tool description**

Replace the `description` value in `src/lib/tools/tools/bash.ts` with:

```ts
description: 'Execute a bash command in the toolbox environment. Has access to standard Linux utilities, curl, jq, git, node, python3, gh CLI, ripgrep, fd-find, and /usr/local/bin/sync-workspace-to-gitea.sh. Host audit commands must be explicitly labelled; ordinary commands run inside the toolbox container, not on the host.',
```

- [ ] **Step 5: Verify test passes**

Run:

```bash
bun test tests/toolbox-contract-regression.test.ts
```

Expected: PASS.

- [ ] **Step 6: Rebuild toolbox and smoke-test command**

Run:

```bash
make prod-rebuild-toolbox
docker exec subcorp-toolbox sh -lc 'command -v sync-workspace-to-gitea.sh && sync-workspace-to-gitea.sh --help || true'
```

Expected: `command -v` prints `/usr/local/bin/sync-workspace-to-gitea.sh`. Help may print usage or the script may exit non-zero for missing args, but it must not say `command not found`.

- [ ] **Step 7: Commit**

```bash
git add docker/toolbox/init-workspace.sh src/lib/tools/tools/bash.ts tests/toolbox-contract-regression.test.ts
git commit -m "fix: stabilize toolbox helper contract"
```

---

## Task 2: Host-aware audit helper and scope labels

**Files:**
- Create: `src/lib/ops/host-audit.ts`
- Modify: `src/app/api/ops/heartbeat/route.ts`
- Create: `tests/host-audit-regression.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/host-audit-regression.test.ts`:

```ts
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
        expect(heartbeat).toContain("Host audit snapshot failed");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/host-audit-regression.test.ts
```

Expected: FAIL because `src/lib/ops/host-audit.ts` does not exist.

- [ ] **Step 3: Add host audit helper**

Create `src/lib/ops/host-audit.ts`:

```ts
import { logger } from '@/lib/logger';
import { execInToolbox } from '@/lib/tools/executor';

const log = logger.child({ module: 'host-audit' });

export interface AuditCommandResult {
    scope: 'host' | 'toolbox';
    command: string;
    exitCode: number;
    stdoutPreview: string;
    stderrPreview?: string;
}

export interface HostAuditSnapshot {
    ok: boolean;
    hostAvailable: boolean;
    commands: AuditCommandResult[];
}

function preview(value: string): string {
    return value.trim().slice(0, 4000);
}

async function runToolbox(command: string): Promise<AuditCommandResult> {
    const result = await execInToolbox(command, 15_000);
    return {
        scope: 'toolbox',
        command,
        exitCode: result.exitCode,
        stdoutPreview: preview(result.stdout),
        ...(result.stderr ? { stderrPreview: preview(result.stderr) } : {}),
    };
}

async function runHost(command: string): Promise<AuditCommandResult> {
    const wrapped = `docker run --rm --network host --pid host --privileged --entrypoint sh debian:bookworm-slim -lc ${JSON.stringify(command)}`;
    const result = await execInToolbox(wrapped, 30_000);
    return {
        scope: 'host',
        command,
        exitCode: result.exitCode,
        stdoutPreview: preview(result.stdout),
        ...(result.stderr ? { stderrPreview: preview(result.stderr) } : {}),
    };
}

export async function checkHostAuditSnapshot(): Promise<HostAuditSnapshot> {
    const commands: AuditCommandResult[] = [];
    commands.push(await runToolbox('ss -ltnup || true'));

    try {
        commands.push(await runHost('apt-get update >/dev/null 2>&1 && apt-get install -y --no-install-recommends iproute2 procps >/dev/null 2>&1 && ss -ltnup || true'));
    } catch (error) {
        log.warn('Host audit command failed; continuing with toolbox-only snapshot', { error });
    }

    return {
        ok: commands.every(command => command.exitCode === 0),
        hostAvailable: commands.some(command => command.scope === 'host'),
        commands,
    };
}
```

- [ ] **Step 4: Add non-fatal heartbeat integration**

In `src/app/api/ops/heartbeat/route.ts`, add import:

```ts
import { checkHostAuditSnapshot } from '@/lib/ops/host-audit';
```

After the workspace permission phase, add:

```ts
        // ── Phase 10c: Host/container audit scope snapshot ──
        try {
            results.hostAudit = await checkHostAuditSnapshot();
        } catch (err) {
            results.hostAudit = { error: (err as Error).message };
            log.error('Host audit snapshot failed', { error: err });
        }
```

- [ ] **Step 5: Verify tests and heartbeat**

```bash
bun test tests/host-audit-regression.test.ts
make prod-rebuild
make prod-heartbeat
```

Expected: test passes; heartbeat returns `hostAudit` with `commands` and does not fail if host scope cannot be reached.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ops/host-audit.ts src/app/api/ops/heartbeat/route.ts tests/host-audit-regression.test.ts
git commit -m "feat: add host-aware audit snapshot"
```

---

## Task 3: Permission checker classification and auto-normalization

**Files:**
- Modify: `src/lib/ops/workspace-permissions.ts`
- Modify: `tests/observability-regression.test.ts`

- [ ] **Step 1: Extend test for auto-normalization command**

In `tests/observability-regression.test.ts`, add this test inside the existing `describe` block:

```ts
    test('workspace permission check can normalize world-writable files', () => {
        const checker = fs.readFileSync(
            path.join(WORKSPACE_ROOT, 'src/lib/ops/workspace-permissions.ts'),
            'utf8',
        );

        expect(checker).toContain('normalizeWorkspacePermissions');
        expect(checker).toContain('find /workspace -type f -perm -0002 -exec chmod 0644 {} +');
        expect(checker).toContain('find /workspace -type d -perm -0002 -exec chmod o-w {} +');
    });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/observability-regression.test.ts
```

Expected: FAIL because `normalizeWorkspacePermissions` is missing.

- [ ] **Step 3: Add normalization helper**

In `src/lib/ops/workspace-permissions.ts`, add below the interface:

```ts
export async function normalizeWorkspacePermissions(): Promise<void> {
    await execInToolbox(
        `find /workspace -type f -perm -0002 -exec chmod 0644 {} +; find /workspace -type d -perm -0002 -exec chmod o-w {} +`,
        30_000,
    );
}
```

Then update `checkWorkspaceWorldWritableFiles()` so it normalizes once before returning:

```ts
    if (files.length > 0) {
        workspaceWorldWritableFilesTotal.inc({ scope: 'workspace' }, files.length);
        log.warn('World-writable workspace files found', {
            count: files.length,
            sample: files.slice(0, 20),
        });
        await normalizeWorkspacePermissions();
    }

    const after = await execInToolbox(
        `find /workspace -type f -perm -0002 -printf '%p %m\\n' 2>/dev/null || true`,
        10_000,
    );
    const remaining = after.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    return {
        ok: remaining.length === 0,
        worldWritableCount: remaining.length,
        files: remaining.slice(0, 100),
    };
```

- [ ] **Step 4: Verify test and live check**

```bash
bun test tests/observability-regression.test.ts
make prod-rebuild
make prod-heartbeat
docker exec subcorp-toolbox sh -lc 'find /workspace -type f -perm -0002 -printf "%p %m\n"'
```

Expected: heartbeat reports `workspacePermissions.ok: true`; final `find` prints no files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ops/workspace-permissions.ts tests/observability-regression.test.ts
git commit -m "fix: auto-normalize workspace permissions"
```

---

## Task 4: Empty LLM round metrics and session metadata

**Files:**
- Modify: `src/lib/metrics.ts`
- Modify: `src/lib/llm/client.ts`
- Modify: `src/lib/tools/agent-session.ts`
- Create: `tests/llm-empty-round-regression.test.ts`

- [ ] **Step 1: Write source regression test**

Create `tests/llm-empty-round-regression.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('LLM empty round observability', () => {
    test('metrics distinguish unrecovered empty text from empty tool-only rounds', () => {
        const metrics = read('src/lib/metrics.ts');
        expect(metrics).toContain('subcorp_llm_empty_text_total');
        expect(metrics).toContain('subcorp_llm_empty_tool_round_total');
        expect(metrics).toContain('incLlmEmptyToolRound');
    });

    test('agent sessions persist empty round count in terminal result', () => {
        const session = read('src/lib/tools/agent-session.ts');
        expect(session).toContain('emptyRounds');
        expect(session).toContain('empty_tool_rounds');
        expect(session).toContain('consecutiveEmptyRounds');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/llm-empty-round-regression.test.ts
```

Expected: FAIL because `subcorp_llm_empty_tool_round_total` and `empty_tool_rounds` do not exist.

- [ ] **Step 3: Add metric**

In `src/lib/metrics.ts`, add:

```ts
export const llmEmptyToolRoundTotal = new Counter({
    name: 'subcorp_llm_empty_tool_round_total',
    help: 'LLM tool rounds that returned no final text but did execute one or more tools.',
    labelNames: ['provider', 'context', 'agent_id'] as const,
    registers: [register],
});

export function incLlmEmptyToolRound(labels: {
    provider: string;
    context?: string | null;
    agentId?: string | null;
}): void {
    llmEmptyToolRoundTotal.inc({
        provider: labels.provider,
        context: labels.context ?? 'unknown',
        agent_id: labels.agentId ?? 'unknown',
    });
}
```

- [ ] **Step 4: Track empty tool rounds in session result**

In `src/lib/tools/agent-session.ts`, add an `emptyRounds` counter inside `runAgentToolLoop`. Increment it whenever a loop round returns no text but has tool calls or no usable text. Include it in the return object and terminal result:

```ts
let emptyRounds = 0;
```

When `text.length === 0`, add:

```ts
emptyRounds++;
```

Change the return shape to include `emptyRounds`:

```ts
return { lastText, toolCalls: allToolCalls, rounds: llmRounds, emptyRounds };
```

Add to `completeSession` result object:

```ts
empty_tool_rounds: loopResult.emptyRounds,
```

- [ ] **Step 5: Increment metric for empty tool rounds**

In `src/lib/llm/client.ts`, import `incLlmEmptyToolRound` from `@/lib/metrics`. In the branch where `ollamaResult` has tool calls but `ollamaResult.text.length === 0`, add:

```ts
            if (ollamaResult.text.length === 0 && ollamaResult.toolCalls.length > 0) {
                incLlmEmptyToolRound({
                    provider: 'ollama-tools',
                    context: trackingContext?.context,
                    agentId: trackingContext?.agentId,
                });
            }
```

- [ ] **Step 6: Verify**

```bash
bun test tests/llm-empty-round-regression.test.ts
bun test
rtk tsc --noEmit
rtk lint
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/metrics.ts src/lib/llm/client.ts src/lib/tools/agent-session.ts tests/llm-empty-round-regression.test.ts
git commit -m "chore: track empty LLM tool rounds"
```

---

## Task 5: Search fallback observability and agent-facing provenance

**Files:**
- Modify: `src/lib/metrics.ts`
- Modify: `src/lib/tools/tools/web-search.ts`
- Create: `tests/search-fallback-regression.test.ts`

- [ ] **Step 1: Inspect current web search tool**

Run:

```bash
grep -n "Brave Search rate-limited\|DuckDuckGo\|web_search" src/lib/tools/tools/web-search.ts
```

Expected: the file contains Brave-first and DuckDuckGo fallback logic.

- [ ] **Step 2: Write failing source test**

Create `tests/search-fallback-regression.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('web search fallback observability', () => {
    test('metrics include Brave to DuckDuckGo fallback counter', () => {
        const metrics = read('src/lib/metrics.ts');
        expect(metrics).toContain('subcorp_web_search_fallback_total');
        expect(metrics).toContain('incWebSearchFallback');
    });

    test('web search results expose provider provenance', () => {
        const webSearch = read('src/lib/tools/tools/web-search.ts');
        expect(webSearch).toContain('provider');
        expect(webSearch).toContain('fallback');
        expect(webSearch).toContain('incWebSearchFallback');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
bun test tests/search-fallback-regression.test.ts
```

Expected: FAIL because fallback metric/provenance is not fully present.

- [ ] **Step 4: Add metric**

In `src/lib/metrics.ts`, add:

```ts
export const webSearchFallbackTotal = new Counter({
    name: 'subcorp_web_search_fallback_total',
    help: 'Web search requests that fell back from a primary provider to a secondary provider.',
    labelNames: ['from_provider', 'to_provider', 'reason'] as const,
    registers: [register],
});

export function incWebSearchFallback(labels: {
    fromProvider: string;
    toProvider: string;
    reason: string;
}): void {
    webSearchFallbackTotal.inc({
        from_provider: labels.fromProvider,
        to_provider: labels.toProvider,
        reason: labels.reason,
    });
}
```

- [ ] **Step 5: Add provenance to web search result**

In `src/lib/tools/tools/web-search.ts`, import `incWebSearchFallback`. In the Brave rate-limit fallback branch, call:

```ts
incWebSearchFallback({
    fromProvider: 'brave',
    toProvider: 'duckduckgo',
    reason: 'rate_limited',
});
```

Ensure returned result objects include:

```ts
provider: 'duckduckgo',
fallback: { from: 'brave', reason: 'rate_limited' },
```

For successful Brave results include:

```ts
provider: 'brave',
fallback: null,
```

- [ ] **Step 6: Verify**

```bash
bun test tests/search-fallback-regression.test.ts
bun test
rtk tsc --noEmit
rtk lint
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/metrics.ts src/lib/tools/tools/web-search.ts tests/search-fallback-regression.test.ts
git commit -m "chore: expose web search fallback provenance"
```

---

## Task 6: Observation log and final smoke report

**Files:**
- Modify: `docs/OBSERVE_TUNE_LOG.md`

- [ ] **Step 1: Run complete verification**

```bash
bun test
rtk tsc --noEmit
rtk lint
make prod-rebuild
make prod-heartbeat
docker exec subcorp-toolbox sh -lc 'find /workspace -type f -perm -0002 -printf "%p %m\n"'
docker ps --filter 'name=subcorp' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Expected:
- `bun test`: all tests pass.
- TypeScript: no errors.
- ESLint: no issues.
- Heartbeat: `status: ok`.
- Permission check: no output.
- Containers: `subcorp-app`, `subcorp-worker`, `subcorp-sanctum`, `subcorp-toolbox` all `Up`.

- [ ] **Step 2: Append observe/tune log entry**

Append to `docs/OBSERVE_TUNE_LOG.md`:

```markdown

## 2026-06-13 — next-wave stabilization

- Fixed toolbox command contract so agents can use `/usr/local/bin/sync-workspace-to-gitea.sh` without PATH ambiguity.
- Added host/container audit scope labelling so operational audits cannot mistake toolbox-local checks for host-level exposure checks.
- Updated workspace permission hygiene to normalize world-writable files after detection and verify clean state after correction.
- Added counters/provenance for empty LLM tool rounds and web-search provider fallback so noisy recovery paths are measurable instead of anecdotal.
- Validation: `bun test`, `rtk tsc --noEmit`, `rtk lint`, `make prod-heartbeat`, container status, and `/workspace` world-writable scan all passed.
- Watch next: qwen3 empty tool-round rate, Brave fallback frequency, stale session sweeps, and whether host-level audit snapshots reduce false-positive/false-negative audit reports.
```

- [ ] **Step 3: Commit**

```bash
git add docs/OBSERVE_TUNE_LOG.md
git commit -m "docs: log next-wave stabilization"
```

---

## Execution Order

1. Task 1 first: it removes the concrete `sync-workspace-to-gitea.sh: command not found` failure.
2. Task 3 second: it makes the permission checker self-healing after rebuilds.
3. Task 2 third: it prevents bad audit reports from container/host scope confusion.
4. Task 4 fourth: it makes empty tool-round recovery measurable before further tuning.
5. Task 5 fifth: it makes degraded research quality observable.
6. Task 6 last: full verification and log.

## Self-Review

Spec coverage:
- Toolbox command availability: Task 1.
- Audit context mismatch: Task 2.
- Workspace permissions recurring issue: Task 3.
- Empty LLM rounds: Task 4.
- Brave Search rate limits: Task 5.
- Observation/reporting continuity: Task 6.

Placeholder scan: no `TBD`, no unspecified test commands, no unbounded “add error handling” steps.

Type consistency: new helpers are named consistently: `checkHostAuditSnapshot`, `normalizeWorkspacePermissions`, `incLlmEmptyToolRound`, and `incWebSearchFallback`.
