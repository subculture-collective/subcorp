import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local', override: false, quiet: true });
dotenv.config({ path: '.env', override: false, quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const migrationsDir = process.env.MIGRATIONS_DIR || path.join(process.cwd(), 'db/migrations');

if (!DATABASE_URL) {
    process.stderr.write('Missing DATABASE_URL\n');
    process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
    process.stderr.write(`Migrations directory not found: ${migrationsDir}\n`);
    process.exit(1);
}

const target = new URL(DATABASE_URL);
process.stdout.write(`Running migrations for ${target.hostname}:${target.port || '5432'}/${target.pathname.slice(1)} as ${target.username}\n`);

const sql = postgres(DATABASE_URL, { max: 1 });

try {
    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
        process.stdout.write(`  → ${file}\n`);
        const text = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await sql.unsafe(text);
    }
    process.stdout.write(`Migrations complete. count=${files.length}\n`);
} finally {
    await sql.end({ timeout: 5 });
}
