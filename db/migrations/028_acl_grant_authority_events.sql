-- Signed append-only ACL grant authority events.
-- Executable file-write authority is derived by replaying each agent's event chain.

CREATE TABLE IF NOT EXISTS ops_acl_grant_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence        BIGINT NOT NULL,
    event_type      TEXT NOT NULL CHECK (event_type IN ('grant_issued', 'grant_revoked')),
    agent_id        TEXT NOT NULL,
    path_prefix     TEXT NOT NULL,
    source          TEXT NOT NULL CHECK (source IN ('mission', 'session', 'manual')),
    source_id       UUID,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id        TEXT NOT NULL,
    reason          TEXT,
    previous_hash   TEXT NOT NULL,
    event_hash      TEXT NOT NULL,
    payload_hash    TEXT NOT NULL,
    signature       TEXT NOT NULL,
    signing_key_id  TEXT NOT NULL,
    CONSTRAINT ops_acl_grant_events_issue_requires_expiry
        CHECK (event_type <> 'grant_issued' OR expires_at IS NOT NULL),
    CONSTRAINT ops_acl_grant_events_hashes_present
        CHECK (length(previous_hash) > 0 AND length(event_hash) = 64 AND length(payload_hash) = 64 AND length(signature) = 64),
    CONSTRAINT ops_acl_grant_events_relative_directory_prefix
        CHECK (path_prefix <> '' AND path_prefix !~ '^/' AND path_prefix !~ '(^|/)\.\.(/|$)' AND path_prefix ~ '/$'),
    CONSTRAINT ops_acl_grant_events_agent_sequence_unique
        UNIQUE (agent_id, sequence),
    CONSTRAINT ops_acl_grant_events_event_hash_unique
        UNIQUE (event_hash)
);

CREATE INDEX IF NOT EXISTS idx_acl_grant_events_agent_chain
    ON ops_acl_grant_events (agent_id, sequence);

CREATE INDEX IF NOT EXISTS idx_acl_grant_events_active_candidates
    ON ops_acl_grant_events (agent_id, expires_at)
    WHERE event_type = 'grant_issued';

CREATE OR REPLACE FUNCTION prevent_ops_acl_grant_events_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ops_acl_grant_events is append-only; append a compensating authority event instead';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ops_acl_grant_events_no_update ON ops_acl_grant_events;
CREATE TRIGGER trg_ops_acl_grant_events_no_update
    BEFORE UPDATE ON ops_acl_grant_events
    FOR EACH ROW EXECUTE FUNCTION prevent_ops_acl_grant_events_mutation();

DROP TRIGGER IF EXISTS trg_ops_acl_grant_events_no_delete ON ops_acl_grant_events;
CREATE TRIGGER trg_ops_acl_grant_events_no_delete
    BEFORE DELETE ON ops_acl_grant_events
    FOR EACH ROW EXECUTE FUNCTION prevent_ops_acl_grant_events_mutation();
