-- 003: Roundtable conversation system
-- Consolidated from: 009, 010, 023 (source col), 029b (daily digests), 047 (voice_chat+agent_design)

-- ── Roundtable Sessions ──
CREATE TABLE IF NOT EXISTS ops_roundtable_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format TEXT NOT NULL,
  topic TEXT NOT NULL,
  participants TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  scheduled_for TIMESTAMPTZ,
  schedule_slot TEXT,
  turn_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- 023: session origin tracking
  source TEXT
);

-- Ensure format CHECK includes all 18 formats (047)
ALTER TABLE ops_roundtable_sessions DROP CONSTRAINT IF EXISTS ops_roundtable_sessions_format_check;
ALTER TABLE ops_roundtable_sessions ADD CONSTRAINT ops_roundtable_sessions_format_check
  CHECK (format IN (
    'standup', 'debate', 'watercooler', 'checkin', 'triage', 'planning',
    'deep_dive', 'strategy', 'writing_room', 'brainstorm', 'cross_exam',
    'risk_review', 'content_review', 'reframe', 'retro', 'shipping',
    'agent_design', 'voice_chat'
  ));

-- Add columns idempotently for existing DBs
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ops_roundtable_sessions' AND column_name = 'source'
    ) THEN
        ALTER TABLE ops_roundtable_sessions ADD COLUMN source TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_roundtable_status ON ops_roundtable_sessions (status);
CREATE INDEX IF NOT EXISTS idx_roundtable_scheduled ON ops_roundtable_sessions (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_roundtable_created ON ops_roundtable_sessions (created_at DESC);

-- ── Roundtable Turns ──
CREATE TABLE IF NOT EXISTS ops_roundtable_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ops_roundtable_sessions(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  dialogue TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_turns_session ON ops_roundtable_turns (session_id);
CREATE INDEX IF NOT EXISTS idx_turns_speaker ON ops_roundtable_turns (speaker);
CREATE INDEX IF NOT EXISTS idx_turns_order ON ops_roundtable_turns (session_id, turn_number);

-- ── Daily Digests ──
CREATE TABLE IF NOT EXISTS ops_daily_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digest_date DATE NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    highlights JSONB NOT NULL DEFAULT '[]',
    stats JSONB NOT NULL DEFAULT '{}',
    generated_by TEXT NOT NULL DEFAULT 'mux',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_digests_date ON ops_daily_digests(digest_date DESC);
