// Signed append-only ACL grant authority events.

import { createHash, createHmac, randomUUID } from 'node:crypto';
import path from 'node:path';

import { stableJson } from './proposal-runner';

export const GRANT_AUTHORITY_GENESIS_HASH = 'GENESIS';
export const DEFAULT_GRANT_SIGNING_KEY_ID = 'subcorp-acl-grant-authority-v1';

export type GrantAuthorityEventType = 'grant_issued' | 'grant_revoked';
export type GrantAuthoritySource = 'mission' | 'session' | 'manual';

export interface GrantAuthorityEvent {
    id: string;
    sequence: number;
    eventType: GrantAuthorityEventType;
    agentId: string;
    pathPrefix: string;
    source: GrantAuthoritySource;
    sourceId: string | null;
    expiresAt: string | null;
    createdAt: string;
    actorId: string;
    reason: string | null;
    previousHash: string;
    eventHash: string;
    payloadHash: string;
    signature: string;
    signingKeyId: string;
}

export interface CreateGrantAuthorityEventInput {
    eventType?: GrantAuthorityEventType;
    agentId: string;
    pathPrefix: string;
    source: GrantAuthoritySource;
    sourceId?: string | null;
    expiresAt?: string | null;
    actorId: string;
    reason?: string | null;
}

export interface ProjectGrantAuthorityOptions {
    checkedAt: string | Date;
    signingSecret: string;
}

interface ChainPosition {
    sequence: number;
    eventHash: string;
}

type SqlLike = <T = unknown[]>(
    strings: TemplateStringsArray,
    ...values: unknown[]
) => PromiseLike<T>;

type TransactionalSqlLike = SqlLike & {
    begin<T>(callback: (sql: SqlLike) => T | Promise<T>): Promise<T>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asIsoString(value: string | Date): string {
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid authority event timestamp: ${value}`);
    }
    return parsed.toISOString();
}

function eventSigningPayload(
    event: Omit<GrantAuthorityEvent, 'eventHash' | 'payloadHash' | 'signature'>,
): Record<string, unknown> {
    return {
        id: event.id,
        sequence: event.sequence,
        event_type: event.eventType,
        agent_id: event.agentId,
        path_prefix: event.pathPrefix,
        source: event.source,
        source_id: event.sourceId,
        expires_at: event.expiresAt,
        created_at: event.createdAt,
        actor_id: event.actorId,
        reason: event.reason,
        previous_hash: event.previousHash,
        signing_key_id: event.signingKeyId,
    };
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function assertValidUuid(value: string, fieldName: string): void {
    if (!UUID_RE.test(value)) {
        throw new Error(`${fieldName} must be a UUID for grant authority events`);
    }
}

function canonicalGrantPathPrefix(pathPrefix: string): string {
    const slashPath = pathPrefix.replaceAll('\\', '/');
    const normalized = path.posix.normalize(slashPath);
    if (
        !pathPrefix ||
        slashPath.startsWith('/') ||
        normalized === '.' ||
        normalized === '..' ||
        normalized.startsWith('../') ||
        normalized.includes('/../') ||
        !slashPath.endsWith('/') ||
        normalized !== slashPath
    ) {
        throw new Error(
            'Grant authority pathPrefix must be a normalized relative directory prefix ending in /',
        );
    }
    return normalized;
}

export function computeGrantAuthorityPayloadHash(
    event: Omit<GrantAuthorityEvent, 'eventHash' | 'payloadHash' | 'signature'>,
): string {
    return sha256(stableJson(eventSigningPayload(event)));
}

export function signGrantAuthorityPayload(
    payloadHash: string,
    signingSecret: string,
): string {
    if (!signingSecret) {
        throw new Error('Grant authority signing secret is required');
    }
    return createHmac('sha256', signingSecret).update(payloadHash).digest('hex');
}

export function computeGrantAuthorityEventHash(
    payloadHash: string,
    signature: string,
): string {
    return sha256(stableJson({ payload_hash: payloadHash, signature }));
}

export function createGrantAuthorityEvent(
    input: CreateGrantAuthorityEventInput,
    options: {
        sequence: number;
        previousHash?: string;
        signingSecret: string;
        createdAt?: string | Date;
        id?: string;
        signingKeyId?: string;
    },
): GrantAuthorityEvent {
    const eventType = input.eventType ?? 'grant_issued';
    const pathPrefix = canonicalGrantPathPrefix(input.pathPrefix);
    if (input.sourceId) assertValidUuid(input.sourceId, 'sourceId');
    const expiresAt = input.expiresAt ? asIsoString(input.expiresAt) : null;
    if (eventType === 'grant_issued' && !expiresAt) {
        throw new Error('grant_issued authority events require expiresAt');
    }

    const base = {
        id: options.id ?? randomUUID(),
        sequence: options.sequence,
        eventType,
        agentId: input.agentId,
        pathPrefix,
        source: input.source,
        sourceId: input.sourceId ?? null,
        expiresAt,
        createdAt: asIsoString(options.createdAt ?? new Date()),
        actorId: input.actorId,
        reason: input.reason ?? null,
        previousHash: options.previousHash ?? GRANT_AUTHORITY_GENESIS_HASH,
        signingKeyId: options.signingKeyId ?? DEFAULT_GRANT_SIGNING_KEY_ID,
    };

    const payloadHash = computeGrantAuthorityPayloadHash(base);
    const signature = signGrantAuthorityPayload(payloadHash, options.signingSecret);
    const eventHash = computeGrantAuthorityEventHash(payloadHash, signature);

    return { ...base, payloadHash, signature, eventHash };
}

export function verifyGrantAuthorityEvent(
    event: GrantAuthorityEvent,
    signingSecret: string,
): void {
    const base = {
        id: event.id,
        sequence: event.sequence,
        eventType: event.eventType,
        agentId: event.agentId,
        pathPrefix: event.pathPrefix,
        source: event.source,
        sourceId: event.sourceId,
        expiresAt: event.expiresAt,
        createdAt: event.createdAt,
        actorId: event.actorId,
        reason: event.reason,
        previousHash: event.previousHash,
        signingKeyId: event.signingKeyId,
    };
    const payloadHash = computeGrantAuthorityPayloadHash(base);
    if (payloadHash !== event.payloadHash) {
        throw new Error(`Grant authority event ${event.id} payload hash mismatch`);
    }

    const signature = signGrantAuthorityPayload(payloadHash, signingSecret);
    if (signature !== event.signature) {
        throw new Error(`Grant authority event ${event.id} signature mismatch`);
    }

    const eventHash = computeGrantAuthorityEventHash(payloadHash, signature);
    if (eventHash !== event.eventHash) {
        throw new Error(`Grant authority event ${event.id} event hash mismatch`);
    }
}

function grantKey(
    event: Pick<GrantAuthorityEvent, 'agentId' | 'pathPrefix' | 'source' | 'sourceId'>,
): string {
    return stableJson({
        agent_id: event.agentId,
        path_prefix: event.pathPrefix,
        source: event.source,
        source_id: event.sourceId,
    });
}

export function replayGrantAuthorityEvents(
    events: GrantAuthorityEvent[],
    options: ProjectGrantAuthorityOptions,
): string[] {
    const checkedAtMs = Date.parse(asIsoString(options.checkedAt));
    const active = new Map<string, GrantAuthorityEvent>();
    let previousHash = GRANT_AUTHORITY_GENESIS_HASH;

    for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
        if (event.previousHash !== previousHash) {
            throw new Error(`Grant authority chain broken before event ${event.id}`);
        }
        verifyGrantAuthorityEvent(event, options.signingSecret);
        previousHash = event.eventHash;

        const key = grantKey(event);
        if (event.eventType === 'grant_revoked') {
            active.delete(key);
            continue;
        }

        if (!event.expiresAt) continue;
        if (Date.parse(event.expiresAt) > checkedAtMs) {
            active.set(key, event);
        } else {
            active.delete(key);
        }
    }

    return [...new Set([...active.values()].map(event => event.pathPrefix))].sort();
}

export function getGrantAuthoritySigningSecret(): string {
    const secret = process.env.GRANT_AUTHORITY_SIGNING_SECRET;
    if (!secret) {
        throw new Error('Missing GRANT_AUTHORITY_SIGNING_SECRET for ACL grant authority events');
    }
    return secret;
}

export function mapGrantAuthorityEventRow(
    row: Record<string, unknown>,
): GrantAuthorityEvent {
    return {
        id: String(row.id),
        sequence: Number(row.sequence),
        eventType: row.event_type as GrantAuthorityEventType,
        agentId: String(row.agent_id),
        pathPrefix: String(row.path_prefix),
        source: row.source as GrantAuthoritySource,
        sourceId: row.source_id ? String(row.source_id) : null,
        expiresAt: row.expires_at ? asIsoString(String(row.expires_at)) : null,
        createdAt: asIsoString(String(row.created_at)),
        actorId: String(row.actor_id),
        reason: row.reason ? String(row.reason) : null,
        previousHash: String(row.previous_hash),
        eventHash: String(row.event_hash),
        payloadHash: String(row.payload_hash),
        signature: String(row.signature),
        signingKeyId: String(row.signing_key_id),
    };
}

export async function loadGrantAuthorityEventsForAgent(
    sql: SqlLike,
    agentId: string,
): Promise<GrantAuthorityEvent[]> {
    const rows = await sql<Record<string, unknown>[]>`
        SELECT id, sequence, event_type, agent_id, path_prefix, source, source_id,
               expires_at, created_at, actor_id, reason, previous_hash, event_hash,
               payload_hash, signature, signing_key_id
        FROM ops_acl_grant_events
        WHERE agent_id = ${agentId}
        ORDER BY sequence ASC
    `;
    return rows.map(mapGrantAuthorityEventRow);
}

export async function appendGrantAuthorityEvent(
    sql: TransactionalSqlLike,
    input: CreateGrantAuthorityEventInput,
    options?: {
        signingSecret?: string;
        createdAt?: string | Date;
        signingKeyId?: string;
    },
): Promise<GrantAuthorityEvent> {
    return sql.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtext(${input.agentId}))`;
        const [latest] = await tx<ChainPosition[]>`
            SELECT sequence, event_hash AS "eventHash"
            FROM ops_acl_grant_events
            WHERE agent_id = ${input.agentId}
            ORDER BY sequence DESC
            LIMIT 1
        `;
        const event = createGrantAuthorityEvent(input, {
            sequence: latest ? Number(latest.sequence) + 1 : 1,
            previousHash: latest?.eventHash ?? GRANT_AUTHORITY_GENESIS_HASH,
            signingSecret: options?.signingSecret ?? getGrantAuthoritySigningSecret(),
            createdAt: options?.createdAt,
            signingKeyId: options?.signingKeyId,
        });

        await tx`
            INSERT INTO ops_acl_grant_events (
                id, sequence, event_type, agent_id, path_prefix, source, source_id,
                expires_at, created_at, actor_id, reason, previous_hash, event_hash,
                payload_hash, signature, signing_key_id
            ) VALUES (
                ${event.id}::uuid, ${event.sequence}, ${event.eventType}, ${event.agentId},
                ${event.pathPrefix}, ${event.source}, ${event.sourceId}::uuid,
                ${event.expiresAt}::timestamptz, ${event.createdAt}::timestamptz,
                ${event.actorId}, ${event.reason}, ${event.previousHash}, ${event.eventHash},
                ${event.payloadHash}, ${event.signature}, ${event.signingKeyId}
            )
        `;

        return event;
    });
}
