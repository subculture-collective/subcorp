#!/bin/sh
set -e

# Run all SQL migrations against the database before starting the app/worker.
# Migrations are idempotent (CREATE IF NOT EXISTS / DO $$ guards).
if [ -d /app/db/migrations ] && [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    node -e "
        const fs = require('fs');
        const path = require('path');
        const postgres = require('postgres');
        const sql = postgres(process.env.DATABASE_URL, { max: 1 });
        (async () => {
            const dir = '/app/db/migrations';
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
            for (const f of files) {
                process.stdout.write('  → ' + f + '\n');
                const text = fs.readFileSync(path.join(dir, f), 'utf8');
                await sql.unsafe(text);
            }
            await sql.end();
            process.stdout.write('Migrations complete.\n');
        })().catch(e => { console.error('Migration error:', e.message); process.exit(1); });
    "
fi

exec "$@"
