import process from 'node:process';

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local', override: false, quiet: true });
dotenv.config({ path: '.env', override: false, quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const raw = process.argv[2];

if (!DATABASE_URL) {
    process.stderr.write('Missing DATABASE_URL\n');
    process.exit(1);
}

if (!['true', 'false'].includes(raw)) {
    process.stderr.write('Usage: node scripts/go-live/set-system-enabled.mjs <true|false>\n');
    process.exit(1);
}

const enabled = raw === 'true';
const sql = postgres(DATABASE_URL, { max: 1 });

try {
    await sql`
        INSERT INTO ops_policy (key, value, description, updated_at)
        VALUES ('system_enabled', ${sql.json({ enabled })}, 'Global system kill switch', now())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = now()
    `;
    process.stdout.write(`System ${enabled ? 'ENGAGED' : 'DISENGAGED'}\n`);
} finally {
    await sql.end({ timeout: 5 });
}
