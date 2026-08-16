import { execFile } from 'node:child_process';

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

function exitCodeFromError(error: Error | null): number {
    if (!error) return 0;
    const record = error as unknown as Record<string, unknown>;
    return typeof record.code === 'number' ? record.code : 1;
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
    const args = [
        'run',
        '--rm',
        '--network',
        'host',
        '--pid',
        'host',
        '--entrypoint',
        'sh',
        'debian:bookworm-slim',
        '-lc',
        command,
    ];

    return new Promise(resolve => {
        execFile('docker', args, {
            timeout: 30_000,
            encoding: 'utf8',
            maxBuffer: 16 * 1024,
        }, (error, stdout, stderr) => {
            resolve({
                scope: 'host',
                command,
                exitCode: exitCodeFromError(error),
                stdoutPreview: preview(stdout),
                ...(stderr ? { stderrPreview: preview(stderr) } : {}),
            });
        });
    });
}

export async function checkHostAuditSnapshot(): Promise<HostAuditSnapshot> {
    const commands: AuditCommandResult[] = [];
    commands.push(await runToolbox('ss -ltnup || true'));

    try {
        // Host audit command: docker run --rm --network host ... ss -ltnup
        commands.push(await runHost(
            'apt-get update >/dev/null 2>&1 && apt-get install -y --no-install-recommends iproute2 procps >/dev/null 2>&1 && ss -ltnup || true',
        ));
    } catch (error) {
        log.warn('Host audit command failed; continuing with toolbox-only snapshot', { error });
    }

    return {
        ok: commands.every(command => command.exitCode === 0),
        hostAvailable: commands.some(command => command.scope === 'host'),
        commands,
    };
}
