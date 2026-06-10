-- 027: Append-only execution evidence for sealed contract step outcomes.
--
-- Each terminal or material step transition should leave an immutable evidence
-- row tied back to the sealed execution contract. This makes the approval
-- boundary auditable after execution: what criteria were checked, what blocker
-- class applied, how many attempts had already occurred, and which artifacts
-- prove the result.

CREATE TABLE IF NOT EXISTS ops_mission_step_execution_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES ops_missions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES ops_mission_steps(id) ON DELETE CASCADE,
  contract_hash TEXT NOT NULL,
  contract_step_index INTEGER NOT NULL,
  step_hash TEXT NOT NULL,
  step_kind TEXT NOT NULL,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('dispatched', 'succeeded', 'blocked', 'failed', 'skipped')),
  acceptance_criteria JSONB NOT NULL DEFAULT '[]',
  acceptance_results JSONB NOT NULL DEFAULT '[]',
  blocker_class TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  artifact_paths TEXT[] NOT NULL DEFAULT '{}',
  evidence JSONB NOT NULL DEFAULT '{}',
  recorded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_step_execution_evidence_step_created
  ON ops_mission_step_execution_evidence (step_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_step_execution_evidence_contract
  ON ops_mission_step_execution_evidence (contract_hash, contract_step_index, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_step_execution_evidence_outcome
  ON ops_mission_step_execution_evidence (outcome, created_at DESC);
