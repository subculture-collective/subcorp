// Discord message formatting — converts markdown features Discord doesn't support

/**
 * Convert markdown tables to ASCII box-drawing tables for Discord.
 * Discord renders markdown bold/italic/code but not tables.
 *
 * Input:
 *   | Header 1 | Header 2 |
 *   | :--- | :--- |
 *   | Cell 1 | Cell 2 |
 *
 * Output:
 *   ┌──────────┬──────────┐
 *   │ Header 1 │ Header 2 │
 *   ├──────────┼──────────┤
 *   │ Cell 1   │ Cell 2   │
 *   └──────────┴──────────┘
 */
export function formatForDiscord(text: string): string {
    return text.replace(
        // Match a block of consecutive lines that look like markdown table rows
        /(?:^[ \t]*\|.+\|[ \t]*$\n?){2,}/gm,
        (tableBlock) => convertMarkdownTable(tableBlock),
    );
}

function convertMarkdownTable(block: string): string {
    const lines = block.trim().split('\n').map(l => l.trim());

    // Parse rows: split by | and trim, ignoring empty edge cells
    const rows: string[][] = [];
    let separatorIdx = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cells = line
            .split('|')
            .slice(1, -1) // remove empty first/last from leading/trailing |
            .map(c => c.trim());

        // Detect separator row (all cells are dashes/colons like :---, ---, ---:)
        if (cells.every(c => /^:?-+:?$/.test(c))) {
            separatorIdx = i;
            continue;
        }

        rows.push(cells);
    }

    if (rows.length === 0) return block;

    // Determine column count from longest row
    const colCount = Math.max(...rows.map(r => r.length));

    // Normalize all rows to same column count
    for (const row of rows) {
        while (row.length < colCount) row.push('');
    }

    // Calculate column widths (min 3 for aesthetics)
    const colWidths = Array.from({ length: colCount }, (_, col) =>
        Math.max(3, ...rows.map(r => (r[col] ?? '').length)),
    );

    // Build ASCII table with box-drawing characters
    const topBorder = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
    const midBorder = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
    const botBorder = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

    const formatRow = (row: string[]) =>
        '│' +
        row
            .map((cell, i) => ` ${(cell ?? '').padEnd(colWidths[i])} `)
            .join('│') +
        '│';

    const result: string[] = [topBorder];

    for (let i = 0; i < rows.length; i++) {
        result.push(formatRow(rows[i]));
        // Add separator after header row (first row if original had separator)
        if (i === 0 && separatorIdx !== -1) {
            result.push(midBorder);
        }
    }

    result.push(botBorder);

    // Wrap in code block so Discord uses monospace (box-drawing needs it)
    return '```\n' + result.join('\n') + '\n```';
}
