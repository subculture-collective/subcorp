-- 004: Policy, triggers, reactions, and cron schedules
-- Consolidated from: 005, 006, 007, 018, 027, 039

-- ── Policy ──
CREATE TABLE IF NOT EXISTS ops_policy (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert core policies (seed.mjs is the authoritative source; these are baseline defaults)
INSERT INTO ops_policy (key, value, description) VALUES
  ('auto_approve', '{"enabled": true, "allowed_step_kinds": ["research_topic","scan_signals","draft_essay","draft_thread","audit_system","patch_code","distill_insight","document_lesson","critique_content","consolidate_memory","memory_archaeology"]}', 'Which step kinds can be auto-approved'),
  ('x_daily_quota', '{"limit": 5}', 'Daily tweet posting limit'),
  ('content_policy', '{"enabled": true, "max_drafts_per_day": 8}', 'Content creation controls'),
  ('initiative_policy', '{"enabled": false}', 'Agent initiative system'),
  ('memory_influence_policy', '{"enabled": true, "probability": 0.3}', 'Memory influence probability'),
  ('relationship_drift_policy', '{"enabled": true, "max_drift": 0.03}', 'Max relationship drift per conversation'),
  ('roundtable_policy', '{"enabled": false, "max_daily_conversations": 5}', 'Conversation system controls'),
  ('system_enabled', '{"enabled": true}', 'Global system kill switch')
ON CONFLICT (key) DO NOTHING;

-- ── Trigger Rules ──
-- Includes condition column from 027
CREATE TABLE IF NOT EXISTS ops_trigger_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  action_config JSONB NOT NULL DEFAULT '{}',
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  fire_count INTEGER NOT NULL DEFAULT 0,
  last_fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  condition JSONB
);

ALTER TABLE ops_trigger_rules ADD COLUMN IF NOT EXISTS condition JSONB;

CREATE INDEX IF NOT EXISTS idx_trigger_rules_enabled ON ops_trigger_rules (enabled);
CREATE INDEX IF NOT EXISTS idx_trigger_rules_event ON ops_trigger_rules (trigger_event);

-- ── Agent Reactions ──
CREATE TABLE IF NOT EXISTS ops_agent_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent TEXT NOT NULL,
  target_agent TEXT NOT NULL,
  source_event_id UUID REFERENCES ops_agent_events(id),
  reaction_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed')),
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reactions_status ON ops_agent_reactions (status);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON ops_agent_reactions (target_agent);
CREATE INDEX IF NOT EXISTS idx_reactions_created ON ops_agent_reactions (created_at DESC);

-- ── Cron Schedules ──
CREATE TABLE IF NOT EXISTS ops_cron_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Chicago',
    prompt TEXT NOT NULL,
    timeout_seconds INTEGER DEFAULT 300,
    max_tool_rounds INTEGER DEFAULT 15,
    model TEXT,
    enabled BOOLEAN DEFAULT true,
    last_fired_at TIMESTAMPTZ,
    next_fire_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_cron_schedules_enabled ON ops_cron_schedules (enabled);
CREATE INDEX IF NOT EXISTS idx_ops_cron_schedules_next_fire_at ON ops_cron_schedules (next_fire_at);
CREATE INDEX IF NOT EXISTS idx_ops_cron_schedules_enabled_next_fire_at ON ops_cron_schedules (enabled, next_fire_at);
