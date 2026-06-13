-- 030: Cron agent-session idempotency

ALTER TABLE ops_agent_sessions
    ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS schedule_slot TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_agent_sessions_cron_slot
ON ops_agent_sessions (tenant_id, source, source_id, schedule_slot)
WHERE source = 'cron' AND schedule_slot IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ops_agent_sessions_schedule_slot
ON ops_agent_sessions (source, source_id, schedule_slot)
WHERE schedule_slot IS NOT NULL;
