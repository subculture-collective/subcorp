import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const env = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match) continue;
        let value = match[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[match[1]] = value;
    }
    return env;
}

function quoteIdent(identifier) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
        throw new Error(`Unsafe SQL identifier: ${identifier}`);
    }
    return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteLiteral(value) {
    return `'${String(value).replaceAll("'", "''")}'`;
}

function runDockerPsql({ container, superuser, database, sql, password }) {
    const child = spawnSync(
        'docker',
        ['exec', '-i', container, 'psql', '-U', superuser, '-d', database, '-v', 'ON_ERROR_STOP=1'],
        { input: sql, encoding: 'utf8' },
    );

    const stdout = (child.stdout || '').replaceAll(password, '<redacted>');
    const stderr = (child.stderr || '').replaceAll(password, '<redacted>');

    if (child.status !== 0) {
        process.stderr.write(stderr);
        process.stdout.write(stdout);
        process.exit(child.status ?? 1);
    }

    return stdout;
}

const fileEnv = { ...parseEnvFile('.env'), ...parseEnvFile('.env.local') };
const databaseUrl = process.env.DATABASE_URL || fileEnv.DATABASE_URL;
const container = process.env.PG_CONTAINER || fileEnv.PG_CONTAINER || 'pg16-pgvector';
const superuser = process.env.PG_SUPERUSER || fileEnv.PG_SUPERUSER || 'onnwee';
const dropOnly = process.argv.includes('--drop-only');
const printTarget = process.argv.includes('--print-target');

if (!databaseUrl) {
    process.stderr.write('Missing DATABASE_URL in environment or .env\n');
    process.exit(1);
}

const url = new URL(databaseUrl);
const db = url.pathname.slice(1);
const role = url.username;
const password = url.password;

if (!db || ['postgres', 'template0', 'template1'].includes(db)) {
    process.stderr.write(`Refusing to reset protected database: ${db || '<empty>'}\n`);
    process.exit(1);
}

const quotedDb = quoteIdent(db);
const quotedRole = quoteIdent(role);
const roleLiteral = quoteLiteral(role);
const passwordLiteral = quoteLiteral(password);
const dbLiteral = quoteLiteral(db);

if (printTarget) {
    process.stdout.write(`${JSON.stringify({ container, superuser, database: db, owner: role, passwordSet: Boolean(password) }, null, 2)}\n`);
    process.exit(0);
}

runDockerPsql({
    container,
    superuser,
    database: 'postgres',
    password,
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${roleLiteral}) THEN
    EXECUTE format('CREATE ROLE %I LOGIN', ${roleLiteral});
  END IF;
END $$;
ALTER ROLE ${quotedRole} WITH LOGIN PASSWORD ${passwordLiteral};
`,
});

runDockerPsql({
    container,
    superuser,
    database: 'postgres',
    password,
    sql: `
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = ${dbLiteral} AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${quotedDb};
${dropOnly ? '' : `CREATE DATABASE ${quotedDb} OWNER ${quotedRole};`}
`,
});

if (!dropOnly) {
    runDockerPsql({
        container,
        superuser,
        database: db,
        password,
        sql: 'CREATE EXTENSION IF NOT EXISTS vector;\n',
    });
}

process.stdout.write(`${dropOnly
    ? `Dropped app database ${db}; secrets not printed.`
    : `Reset app database ${db} owned by ${role}; secrets not printed.`}\n`);
