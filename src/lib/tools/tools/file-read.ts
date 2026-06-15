// file_read tool — read files from /workspace in the toolbox
import type { NativeTool } from '../types';
import { execInToolbox } from '../executor';

export const fileReadTool: NativeTool = {
    name: 'file_read',
    description:
        'Read a file from the shared workspace. Returns the file contents as text. ' +
        'Accepts concrete file paths only; use bash to list directories before reading files. ' +
        '/workspace/projects is the product workspace root. ' +
        '/workspace/projects/subcorp is the Subcorp source checkout. ' +
        '/workspace/output is the artifact output root. ' +
        '/workspace/agents is the agent state root. ' +
        'Do not use /workspace/src; it is not a valid source path.',
    agents: ['chora', 'subrosa', 'thaum', 'praxis', 'mux', 'primus'],
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'File path relative to /workspace (e.g., "data/report.md")',
            },
            max_lines: {
                type: 'number',
                description: 'Maximum lines to read (default: all)',
            },
        },
        required: ['path'],
    },
    execute: async (params) => {
        const rawPath = params.path as string;
        const maxLines = params.max_lines as number | undefined;

        // Prevent path traversal — reject any path containing ..
        if (rawPath.includes('..')) {
            return { error: 'Invalid path: path traversal sequences (..) are not allowed' };
        }
        const fullPath = rawPath.startsWith('/workspace/')
            ? rawPath
            : `/workspace/${rawPath}`;

        let command = `cat '${fullPath.replace(/'/g, "'\\''")}'`;
        if (maxLines) {
            command = `head -n ${maxLines} '${fullPath.replace(/'/g, "'\\''")}'`;
        }

        const result = await execInToolbox(command, 10_000);

        if (result.exitCode !== 0) {
            return {
                error: `File read failed: ${result.stderr || 'file not found'}${pathHintForMissingWorkspacePath(rawPath)}`,
            };
        }

        return { path: fullPath, content: result.stdout, lines: result.stdout.split('\n').length };
    },
};

function pathHintForMissingWorkspacePath(rawPath: string): string {
    if (rawPath.endsWith('/')) {
        return ' Hint: file_read only accepts concrete file paths, not directories. Use bash to list the directory, then call file_read on specific files.';
    }
    if (rawPath.startsWith('/workspace/src') || rawPath.startsWith('src/')) {
        return ' Hint: /workspace/src does not exist. Use /workspace/projects/subcorp/src for Subcorp source, or /workspace/projects/<project>/src for product code.';
    }
    if (rawPath.startsWith('/workspace/projects/') || rawPath.startsWith('projects/')) {
        return ' Hint: verify the project slug under /workspace/projects before reading files; use /workspace/projects/subcorp for the Subcorp checkout.';
    }
    return '';
}
