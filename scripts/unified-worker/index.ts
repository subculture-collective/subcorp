// Unified Worker — single process that handles all background queues
// Replaces: roundtable-worker, mission-worker, initiative-worker
// Adds: agent-session queue (cron-triggered tool-augmented sessions)
//
// Imports directly from src/lib/ — no more 4,000 lines of duplicated code.
//
// Run: node scripts/unified-worker/dist/index.js

import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs/promises';
import path from 'path';
import { orchestrateConversation } from '../../src/lib/roundtable/orchestrator';
import { executeAgentSession } from '../../src/lib/tools/agent-session';
import {
    checkToolboxAvailable,
    disableDockerBackedTools,
} from '../../src/lib/tools/executor';
import { createLogger } from '../../src/lib/logger';
import { FORMATS } from '../../src/lib/roundtable/formats';
import {
    mirrorPublishedDraftBackfill,
    publishApprovedDrafts,
} from '../../src/lib/ops/content-publication';
import { backfillGovernanceVotes } from '../../src/lib/ops/governance';
import {
    processCompletedReviewDrafts,
    releaseStaleReviewDrafts,
    type ReviewDraft,
} from './review-recovery';
import type { MissionExecutionContract } from '../../src/lib/ops/proposal-service';
import type { ProposedStep, RoundtableSession } from '../../src/lib/types';
import type { AgentSession } from '../../src/lib/tools/types';
import type { ConversationFormat, StepKind } from '../../src/lib/types';

const log = createLogger({ service: 'unified-worker' });

// ─── Config ───

const WORKER_ID = `unified-${process.pid}`;
const WORKER_HEARTBEAT_ENABLED = process.env.WORKER_HEARTBEAT_ENABLED !== 'false';
const WORKER_HEARTBEAT_URL =
    process.env.WORKER_HEARTBEAT_URL ??
    'http://subcorp-app:3000/api/ops/heartbeat';
const WORKER_HEARTBEAT_INTERVAL_MS = Number.parseInt(
    process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? '300000',
    10,
);
const WORKER_HEARTBEAT_TIMEOUT_MS = Number.parseInt(
    process.env.WORKER_HEARTBEAT_TIMEOUT_MS ?? '120000',
    10,
);
let lastWorkerHeartbeatAttemptAt = 0;

if (!process.env.DATABASE_URL) {
    log.fatal('Missing DATABASE_URL');
    process.exit(1);
}

async function triggerHeartbeatIfDue(): Promise<boolean> {
    if (!WORKER_HEARTBEAT_ENABLED) return false;
    if (!process.env.CRON_SECRET) {
        log.warn('Worker-managed heartbeat skipped: missing CRON_SECRET');
        return false;
    }

    const now = Date.now();
    // Only trigger heartbeat if last activity was more than 5 minutes ago
    const lastActivity = getLastWorkerActivityTime(); // New method to track activity
    if (lastActivity && now - lastActivity < 300000) {
        return false;
    }

    if (now - lastWorkerHeartbeatAttemptAt < WORKER_HEARTBEAT_INTERVAL_MS) {
        return false;
    }
    lastWorkerHeartbeatAttemptAt = now;

    const startedAt = Date.now();
    try {
        const response = await fetch(WORKER_HEARTBEAT_URL, {
            headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
            signal: AbortSignal.timeout(WORKER_HEARTBEAT_TIMEOUT_MS),
        });
        const body = await response.text();
        const durationMs = Date.now() - startedAt;

        if (!response.ok) {
            log.warn('Worker-managed heartbeat failed', {
                status: response.status,
                durationMs,
                body: body.slice(0, 500),
            });
            return false;
        }

        let summary: unknown = body.slice(0, 500);
        try {
            const parsed = JSON.parse(body) as {
                status?: string;
                triggers?: { fired?: number; evaluated?: number };
                roundtable?: { enqueued?: string | null };
                cron?: { fired?: number; evaluated?: number };
            };
            summary = {
                status: parsed.status,
