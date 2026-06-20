import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Discord regression guards', () => {
    test('webhook content is clamped before Discord rejects long posts', () => {
        const source = readFileSync('src/lib/discord/client.ts', 'utf8');

        expect(source).toContain('DISCORD_CONTENT_LIMIT = 2000');
        expect(source).toContain('truncateDiscordContent');
        expect(source).toContain('truncated to fit Discord 2000 character limit');
        expect(source).toContain('payload.content = truncateDiscordContent(options.content)');
    });
});
