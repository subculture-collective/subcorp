// bash tool — execute commands in the toolbox container
import type { NativeTool } from '../types';
import { execInToolbox } from '../executor';

function forbiddenAutonomousPublishCommand(command: string): string | null {
    const normalized = command.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim();

    if (/\bgit\s+commit\b/i.test(normalized)) {
        return 'git commit is disabled for autonomous agent bash sessions; write a PR-ready summary artifact instead';
    }
    if (/\bgit\s+push\b/i.test(normalized)) {
        return 'git push is disabled for autonomous agent bash sessions; write a PR-ready summary artifact instead';
    }
    if (/\b(?:gh|tea)\s+(?:pr|pull|pulls)\s+(?:create|new)\b/i.test(normalized)) {
        return 'pull request creation is disabled for autonomous agent bash sessions; write a PR-ready summary artifact instead';
    }

    return null;
}

function forbiddenWorkspaceRootWriteCommand(command: string): string | null {
    const normalized = command.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim();
    const writesWorkspaceRootPackage = /\bnpm\s+init\b/i.test(normalized) &&
        !/\bcd\s+\/workspace\/projects\/[^\s;&|]+\s*&&/i.test(normalized) &&
        !/\b--prefix\s+\/workspace\/projects\/[^\s;&|]+\b/i.test(normalized);
    if (writesWorkspaceRootPackage) {
        return 'npm init must run inside a mission-specific /workspace/projects/<slug> directory, not /workspace or /workspace/projects root';
    }

    const writeVerb = /\b(?:mkdir|touch|cp|mv|rm|install|npm|pnpm|yarn|bun|python|python3|node)\b|>|\btee\b/i;
    const directProjectsRootTarget = /\/workspace\/projects\/(?:package\.json|README\.md|app\.py|server\.js|index\.[a-z]+|src(?:\/|\b)|tests?(?:\/|\b)|config(?:\/|\b))/i;
    if (writeVerb.test(normalized) && directProjectsRootTarget.test(normalized)) {
        return 'product code writes must target a mission-specific /workspace/projects/<slug>/ directory, not /workspace/projects root';
    }

    return null;
}

export const bashTool: NativeTool = {
    name: 'bash',
    description: 'Execute a bash command in the toolbox environment. Has access to standard Linux utilities, curl, jq, git, node, python3, gh CLI, ripgrep, fd-find, and /usr/local/bin/sync-workspace-to-gitea.sh. Host audit commands must be explicitly labelled; ordinary commands run inside the toolbox container, not on the host.',
    agents: ['praxis', 'mux'],
    parameters: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The bash command to execute',
            },
            timeout_ms: {
                type: 'number',
                description: 'Timeout in milliseconds (default 30000, max 120000)',
            },
        },
        required: ['command'],
    },
    execute: async (params) => {
        const command = params.command as string;
        const forbidden = forbiddenAutonomousPublishCommand(command);
        if (forbidden) {
            return { error: forbidden, denied: true };
        }
        const workspaceRootWrite = forbiddenWorkspaceRootWriteCommand(command);
        if (workspaceRootWrite) {
            return { error: workspaceRootWrite, denied: true, policy: 'workspace_project_root_boundary' };
        }

        const timeoutMs = Math.min(
            (params.timeout_ms as number) || 30_000,
            120_000,
        );

        const result = await execInToolbox(command, timeoutMs);

        if (result.timedOut) {
            return { error: `Command timed out after ${timeoutMs}ms`, stderr: result.stderr };
        }

        return {
            exitCode: result.exitCode,
            stdout: result.stdout,
            ...(result.stderr ? { stderr: result.stderr } : {}),
        };
    },
};
