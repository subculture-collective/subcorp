// /api/ops/workspace — Browse the agent workspace filesystem
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { execInToolbox } from '@/lib/tools/executor';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const WORKSPACE_ROOT = '/workspace';
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function sanitizePath(rawPath: string): string | null {
    const normalized = path.normalize(rawPath);
    // Reject path traversal
    if (normalized.includes('..')) return null;
    // Must start with /
    if (!normalized.startsWith('/')) return null;
    return normalized;
}

function shellEscape(s: string): string {
    return "'" + s.replace(/'/g, "'\\''") + "'";
}

export async function GET(request: Request) {
    const authResult = await requireRole('member', 'admin');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path') ?? '/';
    const raw = searchParams.get('raw') === 'true';

    const safePath = sanitizePath(rawPath);
    if (!safePath) {
        return NextResponse.json(
            { error: 'Invalid path' },
            { status: 400 },
        );
    }

    const fullPath = path.join(WORKSPACE_ROOT, safePath);
    const escapedPath = shellEscape(fullPath);

    try {
        if (raw) {
            // Read file content
            const sizeResult = await execInToolbox(
                `stat -c '%s' ${escapedPath} 2>/dev/null || echo -1`,
            );
            const fileSize = parseInt(sizeResult.stdout.trim(), 10);
            if (fileSize < 0) {
                return NextResponse.json(
                    { error: 'File not found' },
                    { status: 404 },
                );
            }
            if (fileSize > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { error: `File too large (${fileSize} bytes, max ${MAX_FILE_SIZE})` },
                    { status: 413 },
                );
            }

            const result = await execInToolbox(`cat ${escapedPath}`);
            if (result.exitCode !== 0) {
                return NextResponse.json(
                    { error: 'Failed to read file' },
                    { status: 500 },
                );
            }

            return NextResponse.json({
                path: safePath,
                content: result.stdout,
                size: fileSize,
            });
        }

        // List directory
        // Output: type\tsize\tmodified\tname per line
        const result = await execInToolbox(
            `if [ ! -d ${escapedPath} ]; then echo '__NOT_DIR__'; exit 1; fi; ` +
            `ls -1Ap ${escapedPath} | while IFS= read -r name; do ` +
            `  fp=${escapedPath}/"$name"; ` +
            `  if [ -d "$fp" ]; then ` +
            `    echo "dir\t0\t$(stat -c '%Y' "$fp" 2>/dev/null || echo 0)\t$name"; ` +
            `  else ` +
            `    echo "file\t$(stat -c '%s' "$fp" 2>/dev/null || echo 0)\t$(stat -c '%Y' "$fp" 2>/dev/null || echo 0)\t$name"; ` +
            `  fi; ` +
            `done`,
        );

        if (result.exitCode !== 0) {
            if (result.stdout.includes('__NOT_DIR__')) {
                return NextResponse.json(
                    { error: 'Not a directory' },
                    { status: 400 },
                );
            }
            return NextResponse.json(
                { error: 'Failed to list directory' },
                { status: 500 },
            );
        }

        const entries = result.stdout
            .trim()
            .split('\n')
            .filter(Boolean)
            .map(line => {
                const [type, size, modified, ...nameParts] = line.split('\t');
                const name = nameParts.join('\t');
                return {
                    name: name.replace(/\/$/, ''), // strip trailing slash from dirs
                    type,
                    size: parseInt(size, 10),
                    modified: parseInt(modified, 10),
                };
            })
            .filter(e => e.name && e.name !== '.' && e.name !== '..');

        // Sort: directories first, then alphabetical
        entries.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        return NextResponse.json({
            path: safePath,
            entries,
        });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 },
        );
    }
}
