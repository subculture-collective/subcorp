// Docker exec wrapper — runs commands inside the toolbox container
import { execFile } from 'node:child_process';
import { logger } from '@/lib/logger';
import type { ExecResult } from './types';

const log = logger.child({ module: 'executor' });

const TOOLBOX_CONTAINER = 'subcult-toolbox';
const MAX_STDOUT = 50 * 1024; // 50KB cap
const MAX_STDERR = 10 * 1024; // 10KB cap
const DEFAULT_TIMEOUT_MS = 30_000;

export const DOCKER_BACKED_TOOL_NAMES = new Set([
    'bash',
    'file_read',
    'file_write',
    'web_fetch',
    'send_to_agent',
    'spawn_droid',
    'check_droid',
]);

export function dockerBackedToolsEnabled(): boolean {
    return (
        process.env.DOCKER_BACKED_TOOLS_ENABLED !== 'false' &&
        process.env.TOOLBOX_TOOLS_ENABLED !== 'false'
    );
}

export function disableDockerBackedTools(reason: string): void {
    process.env.DOCKER_BACKED_TOOLS_ENABLED = 'false';
    log.warn('Docker-backed tools disabled', { reason });
}

export async function checkToolboxAvailable(): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!dockerBackedToolsEnabled()) {
        return { ok: false, reason: 'Docker-backed tools disabled by environment' };
    }

    return new Promise(resolve => {
        execFile('docker', ['exec', TOOLBOX_CONTAINER, 'true'], {
            timeout: 5_000,
            encoding: 'utf8',
        }, (error, _stdout, stderr) => {
            if (!error) {
                resolve({ ok: true });
                return;
            }
            resolve({
                ok: false,
                reason: (stderr || error.message || 'docker exec failed').trim(),
            });
        });
    });
}

/** Extract the exit code from a child_process error. Defaults to 1 for unknown errors. */
function getExitCode(error: Error): number {
    const err = error as unknown as Record<string, unknown>;
    // execFile provides the exit status in error.status for non-signal exits
    if (typeof err.status === 'number') return err.status;
    // Fallback to error.code if it's numeric
    if (typeof err.code === 'number') return err.code;
    return 1;
}

/**
 * Execute a command inside the toolbox container via `docker exec`.
 * Output is capped to avoid flooding LLM context.
 */
export async function execInToolbox(
    command: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ExecResult> {
    if (!dockerBackedToolsEnabled()) {
        return {
            stdout: '',
            stderr: 'Docker-backed tools are disabled for this executor runtime.',
            exitCode: 126,
            timedOut: false,
        };
    }

    return new Promise(resolve => {
        const args = [
            'exec',
            TOOLBOX_CONTAINER,
            'bash',
            '-c',
            command,
        ];

        const child = execFile('docker', args, {
            timeout: timeoutMs,
            maxBuffer: MAX_STDOUT + MAX_STDERR,
            encoding: 'utf8',
        }, (error, stdout, stderr) => {
            let timedOut = false;
            let exitCode = 0;

            if (error) {
                if (error.killed || error.code === 'ERR_CHILD_PROCESS_STDIO_FINAL_CLOSE') {
                    timedOut = true;
                }
                exitCode = getExitCode(error);
                const message = `${stderr}\n${error.message}`;
                if (message.includes('permission denied') || message.includes('Cannot connect to the Docker daemon')) {
                    log.error('Docker-backed executor cannot reach Docker', {
                        command: command.slice(0, 200),
                        stderr: stderr.slice(0, 500),
                    });
                }
            }

            // Cap output
            const cappedStdout = stdout.length > MAX_STDOUT
                ? stdout.slice(0, MAX_STDOUT) + '\n... [output truncated at 50KB]'
                : stdout;
            const cappedStderr = stderr.length > MAX_STDERR
                ? stderr.slice(0, MAX_STDERR) + '\n... [stderr truncated at 10KB]'
                : stderr;

            if (timedOut) {
                log.warn('Toolbox exec timed out', { command: command.slice(0, 200), timeoutMs });
            }

            resolve({
                stdout: cappedStdout,
                stderr: cappedStderr,
                exitCode,
                timedOut,
            });
        });

        // Additional safety: kill if process handle exists
        child.on('error', err => {
            log.error('Toolbox exec error', { error: err, command: command.slice(0, 200) });
            resolve({
                stdout: '',
                stderr: `exec error: ${err.message}`,
                exitCode: 1,
                timedOut: false,
            });
        });
    });
}
