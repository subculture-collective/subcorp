-- 001: Core operational tables
-- Consolidated from: 001, 002, 003, 004, 008, 016a (step kinds), 022 (deps), 025, 026

-- ── Mission Proposals ──
CREATE TABLE IF NOT EXISTS ops_mission_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason TEXT,
  proposed_steps JSONB NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'agent'
    CHECK (source IN ('agent', 'trigger', 'reaction', 'initiative', 'conversation', 'user_question')),
  source_trace_id TEXT,
  auto_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON ops_mission_proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposals_agent ON ops_mission_proposals (agent_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON ops_mission_proposals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_source_trace ON ops_mission_proposals (source_trace_id);

-- ── Missions ──
CREATE TABLE IF NOT EXISTS ops_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES ops_mission_proposals(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'running', 'succeeded', 'failed', 'cancelled')),
  created_by TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_status ON ops_missions (status);
CREATE INDEX IF NOT EXISTS idx_missions_created_by ON ops_missions (created_by);
CREATE INDEX IF NOT EXISTS idx_missions_created ON ops_missions (created_at DESC);

-- ── Mission Steps ──
-- Includes expanded kind set (016a), dependency columns (022), template tracking (026)
CREATE TABLE IF NOT EXISTS ops_mission_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES ops_missions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  reserved_by TEXT,
  failure_reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 022: dependency columns
  project_id UUID,
  output_path TEXT,
  depends_on UUID[] DEFAULT '{}',
  assigned_agent TEXT,
  -- 026: template tracking
  template_version INT DEFAULT 1
);

-- Ensure expanded kind CHECK constraint
ALTER TABLE ops_mission_steps DROP CONSTRAINT IF EXISTS ops_mission_steps_kind_check;
ALTER TABLE ops_mission_steps ADD CONSTRAINT ops_mission_steps_kind_check
  CHECK (kind IN (
    -- Research / analysis
    'analyze_discourse', 'scan_signals', 'research_topic', 'distill_insight',
    'classify_pattern', 'trace_incentive', 'identify_assumption',
    -- Content creation
    'draft_thread', 'draft_essay', 'critique_content', 'refine_narrative',
    'prepare_statement', 'write_issue',
    -- System / ops
    'audit_system', 'review_policy', 'consolidate_memory', 'map_dependency',
    'patch_code', 'document_lesson', 'log_event', 'tag_memory',
    'escalate_risk', 'convene_roundtable', 'propose_workflow', 'memory_archaeology',
    -- Legacy kinds (kept for existing data)
    'draft_tweet', 'post_tweet', 'crawl', 'analyze',
    'write_content', 'research', 'deploy', 'review', 'summarize'
  ));

-- Add columns idempotently for existing DBs
ALTER TABLE ops_mission_steps ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE ops_mission_steps ADD COLUMN IF NOT EXISTS output_path TEXT;
ALTER TABLE ops_mission_steps ADD COLUMN IF NOT EXISTS depends_on UUID[] DEFAULT '{}';
ALTER TABLE ops_mission_steps ADD COLUMN IF NOT EXISTS assigned_agent TEXT;
ALTER TABLE ops_mission_steps ADD COLUMN IF NOT EXISTS template_version INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_steps_mission ON ops_mission_steps (mission_id);
CREATE INDEX IF NOT EXISTS idx_steps_status_kind ON ops_mission_steps (status, kind);
CREATE INDEX IF NOT EXISTS idx_steps_created ON ops_mission_steps (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_steps_project ON ops_mission_steps (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_steps_assigned ON ops_mission_steps (assigned_agent) WHERE assigned_agent IS NOT NULL;

-- ── Agent Events ──
CREATE TABLE IF NOT EXISTS ops_agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_agent ON ops_agent_events (agent_id);
CREATE INDEX IF NOT EXISTS idx_events_kind ON ops_agent_events (kind);
CREATE INDEX IF NOT EXISTS idx_events_tags ON ops_agent_events USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_events_created ON ops_agent_events (created_at DESC);

-- ── Action Runs ──
CREATE TABLE IF NOT EXISTS ops_action_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'failed')),
  result JSONB DEFAULT '{}',
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_runs_action ON ops_action_runs (action);
CREATE INDEX IF NOT EXISTS idx_action_runs_created ON ops_action_runs (created_at DESC);

-- ── ACL Grants ──
CREATE TABLE IF NOT EXISTS ops_acl_grants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    TEXT NOT NULL,
    path_prefix TEXT NOT NULL,
    source      TEXT NOT NULL CHECK (source IN ('mission', 'session', 'manual')),
    source_id   UUID,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acl_grants_active ON ops_acl_grants (agent_id, expires_at);
