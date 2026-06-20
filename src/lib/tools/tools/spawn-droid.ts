// spawn_droid tool — create a focused sub-agent for a specific task
// Droids are short-lived agent sessions with restricted workspace access.
import { sql } from '@/lib/db';
import { execInToolbox } from '../executor';
import { randomUUID } from 'node:crypto';
import type { NativeTool } from '../types';
import { ALL_AGENTS } from '@/lib/types';

const MAX_DROID_TIMEOUT = process.env.MAX_DROID_TIMEOUT_SECONDS ? parseInt(process.env.MAX_DROID_TIMEOUT_SECONDS) : 300;
const DEFAULT_DROID_TIMEOUT = process.env.DEFAULT_DROID_TIMEOUT_SECONDS ? parseInt(process.env.DEFAULT_DROID_TIMEOUT_SECONDS) : 120;

function invalidDroidTaskReason(task: string): string | null {
    if (/\b(?:captcha|CAPTCHA|captcha solver|solve captcha|bypass captcha)\b/i.test(task)) {
        return 'droid tasks cannot solve or bypass CAPTCHA-gated sources; ask for an alternate accessible source or mark the source as unavailable';
    }

    if (/\b(?:bash|shell commands?|shell audit|run shell|mkdir|cat\s*>|tee\s+|echo\s+.*>|redirection)\b/i.test(task)) {
        return 'droid tasks cannot require bash, shell audit, shell commands, or shell redirection';
    }

    if (/(?:\/workspace\/)?projects(?:\/|\b)/i.test(task)
        && /\b(?:explore|survey|list|enumerate|walk|map|scan)\b/i.test(task)
        && /\b(?:recursively|recursive|entire|tree|directory|directories|every file|all files)\b/i.test(task)) {
        return 'droid tasks cannot recursively list /workspace/projects because droids have no directory listing tool; parent agents must enumerate concrete files first or run the audit themselves';
    }

    if (/(?:\/workspace\/)?(?:output|projects|agents)\/[\w./-]+/i.test(task)
        && /\b(?:write|create|modify|edit|save|add|update|rewrite|patch|fix|implement)\b/i.test(task)) {
        return 'droid tasks cannot modify /workspace/output, /workspace/projects, or /workspace/agents paths; ask the droid for a draft/patch and promote it from the parent agent';
    }

    if (/\b(?:write|create|modify|edit|save)\b[^\n]{0,120}(?:\/workspace\/)?(?:output|projects|agents)\//i.test(task)) {
        return 'droid tasks cannot write outside their droids/<id>/ workspace; ask the droid for a draft/patch and promote it from the parent agent';
    }

    if (/(?:\/workspace\/)?(?:output|projects|agents)\/[\w./-]+[^\n]{0,80}\b(?:before|after|when done|as output|output path)\b/i.test(task)) {
        return 'droid output must stay under droids/<id>/; parent agents must write promoted artifacts';
    }

    return null;
}

export const spawnDroidTool: NativeTool = {
    name: 'spawn_droid',
    description: 'Spawn a droid (sub-agent) to handle a focused task asynchronously. The droid runs as an agent session with its own workspace under /workspace/droids/. Returns only a queued droid_id/session_id/output_path handle. Do not cite, summarize, or use the droid output as evidence until check_droid returns status=succeeded with output_preview.',
    agents: [...ALL_AGENTS],
    parameters: {
        type: 'object',
        properties: {
            task: {
                type: 'string',
                description: 'Clear description of what the droid should do',
            },
            output_path: {
                type: 'string',
                description: 'Where the droid should write results relative to its droid workspace (e.g., "report.md"). This expected path is not evidence that the file exists; call check_droid and wait for status=succeeded before using it.',
            },
            timeout_seconds: {
                type: 'number',
                description: `Max execution time in seconds (default ${DEFAULT_DROID_TIMEOUT}, max ${MAX_DROID_TIMEOUT})`,
            },
        },
        required: ['task'],
    },
    execute: async (params) => {
        const task = params.task as string;
        const rawOutputFilename = (params.output_path as string) ?? 'output.md';

        const invalidTaskReason = invalidDroidTaskReason(task);
        if (invalidTaskReason) {
            return {
                error: invalidTaskReason,
                denied: true,
                policy: 'droid_workspace_boundary',
            };
        }

        // Sanitize output_path: remove all path traversal attempts and unsafe characters
        const outputFilename = rawOutputFilename
            .replace(/\.\./g, '')                 // Remove all .. sequences (including ../ and ..\)
            .replace(/[^a-zA-Z0-9._-]/g, '_')     // Replace unsafe chars with underscore
            .replace(/^[._-]+/, '')               // Remove leading dots/dashes
            .slice(0, 128);                       // Limit length

        // Fallback to default if sanitization results in empty string
        const safeOutputFilename = outputFilename || 'output.md';

        const timeout = Math.min(
            (params.timeout_seconds as number) ?? DEFAULT_DROID_TIMEOUT,
            MAX_DROID_TIMEOUT,
        );

        const droidId = `droid-${randomUUID().slice(0, 8)}`;
        const droidDir = `/workspace/droids/${droidId}`;
        const outputPath = `droids/${droidId}/${safeOutputFilename}`;

        // Create droid workspace
        try {
            await execInToolbox(`mkdir -p '${droidDir}/output'`, 5_000);

            // Write task description
            const taskContent = `# Droid Task\n\nID: ${droidId}\nCreated: ${new Date().toISOString()}\n\n## Task\n\n${task}\n\n## Output\n\nWrite results to: ${outputPath}\n`;
            const b64 = Buffer.from(taskContent).toString('base64');
            await execInToolbox(`echo '${b64}' | base64 -d > '${droidDir}/task.md' && chmod 0644 '${droidDir}/task.md'`, 5_000);
        } catch {
            return { error: 'Failed to create droid workspace' };
        }

        // Build droid prompt with security boundaries
        const prompt = `You are a droid (focused sub-agent) with ID: ${droidId}.\n\n` +
            `## Your Task\n${task}\n\n` +
            `## Security Boundaries\n` +
            `- You can ONLY write files to droids/${droidId}/ using file_write\n` +
            `- You can read any file in /workspace/ using file_read\n` +
            `- You can use web_search and web_fetch as needed\n` +
            `- You cannot use bash or shell redirection; use file_read/file_write only for workspace files\n` +
            `- You CANNOT write to /workspace/output/ directly — your parent agent must promote your work\n` +
            `- You CANNOT modify /workspace/projects/ source code — write patches to your droid workspace\n\n` +
            `- If the task asks you to use shell commands or write outside droids/${droidId}/, refuse and write a boundary note to ${outputPath}\n\n` +
            `## Output\n` +
            `Write your results to ${outputPath} using file_write.\n` +
            `When done, provide a clear summary of what you accomplished.\n`;

        // Create agent session for the droid
        try {
            const [session] = await sql<[{ id: string }]>`
                INSERT INTO ops_agent_sessions (
                    agent_id, prompt, source, source_id,
                    timeout_seconds, max_tool_rounds, status,
                    result
                ) VALUES (
                    ${droidId},
                    ${prompt},
                    'droid',
                    ${droidId},
                    ${timeout},
                    30,
                    'pending',
                    ${sql.json({ droid_id: droidId, output_path: outputPath })}::jsonb
                )
                RETURNING id
            `;

            return {
                droid_id: droidId,
                session_id: session.id,
                status: 'spawned',
                workspace: droidDir,
                output_path: outputPath,
                async: true,
                evidence_ready: false,
                next_step: `Call check_droid with droid_id ${droidId}; do not cite or depend on ${outputPath} until check_droid returns status=succeeded with output_preview.`,
            };
        } catch (err) {
            return { error: `Failed to spawn droid: ${(err as Error).message}` };
        }
    },
};
