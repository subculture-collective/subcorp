import { describe, test, expect } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = '/mnt/spektr/server/projects/subcult-corp';
const SQL_PATH = path.join(
  WORKSPACE_ROOT,
  'db/migrations/017_seed_cron_schedules.sql',
);

const EXPECTED_JOBS = [
  { name: 'Morning Research Scan', agent: 'chora', cron: '0 12 * * *' },
  { name: 'Social & Market Scanner', agent: 'chora', cron: '0 13,23 * * *' },
  { name: 'Daily Briefing', agent: 'chora', cron: '0 2 * * *' },
  { name: 'AI & Tech Radar', agent: 'chora', cron: '0 17 * * *' },
  { name: 'Subcult Watch', agent: 'chora', cron: '0 19 * * *' },
  { name: 'Weekly Deep Digest', agent: 'chora', cron: '0 23 * * 0' },
  { name: 'Agent Dream', agent: 'thaum', cron: '0 8 * * *' },
  { name: 'Nightly Synthesis', agent: 'chora', cron: '0 11 * * *' },
  { name: 'Federation Roundtable', agent: 'primus', cron: '0 21 * * 5' },
  { name: 'CVE Security Check', agent: 'subrosa', cron: '30 12 * * *' },
  { name: 'Calendar Briefing', agent: 'mux', cron: '0 12 * * *' },
  { name: 'Email Triage', agent: 'mux', cron: '0 14 * * *' },
];

function readSql(): string {
  return fs.readFileSync(SQL_PATH, 'utf8');
}

describe('017_seed_cron_schedules.sql', () => {
  test('contains exactly 12 INSERT statements', () => {
    const sql = readSql();
    const insertMatches = sql.match(/\bINSERT INTO ops_cron_schedules\b/g) ?? [];
    expect(insertMatches.length).toBe(12);
  });

  test('all INSERTs use WHERE NOT EXISTS idempotency guard', () => {
    const sql = readSql();
    const guardMatches = sql.match(
      /WHERE NOT EXISTS \(SELECT 1 FROM ops_cron_schedules WHERE name = '[^']+'\);/g,
    ) ?? [];
    expect(guardMatches.length).toBe(12);
  });

  test('job names match the source of truth list', () => {
    const sql = readSql();
    const nameMatches = sql.match(/SELECT '([^']+)', '[^']+', '[^']+'/g) ?? [];
    const names = nameMatches.map(match => match.split("SELECT '")[1].split("',")[0]);
    const uniqueNames = Array.from(new Set(names)).sort();
    const expectedNames = EXPECTED_JOBS.map(job => job.name).sort();
    expect(uniqueNames).toEqual(expectedNames);
  });

  test('agent assignments and cron expressions match for each job', () => {
    const sql = readSql();
    const rowRegex =
      /SELECT '([^']+)', '([^']+)', '([^']+)', 'America\/Chicago', \$\$/g;
    const found = new Map<string, { agent: string; cron: string }>();
    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(sql)) !== null) {
      const [, name, agent, cron] = match;
      found.set(name, { agent, cron });
    }

    expect(found.size).toBe(12);
    for (const job of EXPECTED_JOBS) {
      const row = found.get(job.name);
      expect(row).toEqual({ agent: job.agent, cron: job.cron });
    }
  });

  test('dollar-quoting is balanced with 12 pairs of $$', () => {
    const sql = readSql();
    const dollarQuoteMatches = sql.match(/\$\$/g) ?? [];
    expect(dollarQuoteMatches.length).toBe(24);
  });
});
