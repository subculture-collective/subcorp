#!/usr/bin/env node
// Seed the first admin user. Prompts for email, username, password.
// Usage: node scripts/go-live/seed-admin.mjs

import postgres from 'postgres';
import argon2 from 'argon2';
import readline from 'readline';

const out = (...args) => process.stdout.write(`${args.join(' ')}\n`);
const errOut = (...args) => process.stderr.write(`${args.join(' ')}\n`);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    errOut('Missing DATABASE_URL environment variable');
    process.exit(1);
}

const sql = postgres(DATABASE_URL);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
    const email = await ask('Admin email: ');
    const username = await ask('Admin username: ');
    const password = await ask('Admin password: ');

    if (!email || !username || !password) {
        errOut('All fields are required');
        process.exit(1);
    }

    if (password.length < 8) {
        errOut('Password must be at least 8 characters');
        process.exit(1);
    }

    const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
    });

    await sql.begin(async (tx) => {
        const [user] = await tx`
            INSERT INTO users (email, username, role)
            VALUES (${email.toLowerCase()}, ${username.toLowerCase()}, 'admin')
            ON CONFLICT (email) DO UPDATE SET role = 'admin', updated_at = NOW()
            RETURNING id, email, username, role
        `;

        await tx`
            INSERT INTO user_credentials (user_id, password_hash)
            VALUES (${user.id}, ${passwordHash})
            ON CONFLICT (user_id) DO UPDATE SET password_hash = ${passwordHash}, updated_at = NOW()
        `;

        out('\nAdmin user created/updated:');
        out(`  ID:       ${user.id}`);
        out(`  Email:    ${user.email}`);
        out(`  Username: ${user.username}`);
        out(`  Role:     ${user.role}`);
    });

    rl.close();
    await sql.end();
}

main().catch(err => {
    errOut(err?.stack ?? err);
    process.exit(1);
});
