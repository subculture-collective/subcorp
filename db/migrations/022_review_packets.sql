-- 022: Durable review packets for proposal review/approval state.
--
-- Review notifications and approval decisions need a durable packet that can be
-- inspected, replayed, or repaired independently of ephemeral events.

CREATE TABLE IF NOT EXISTS ops_review_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'awaiting_review', 'approved', 'rejected', 'blocked', 'archived')),
  requested_by TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  transition_rules_version INTEGER NOT NULL DEFAULT 1,
  packet JSONB NOT NULL DEFAULT '{}',
  decision JSONB,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_review_packets_status ON ops_review_packets (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_packets_artifact_id ON ops_review_packets (artifact_id);
CREATE INDEX IF NOT EXISTS idx_review_packets_subject ON ops_review_packets (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_review_packets_updated ON ops_review_packets (updated_at DESC);
