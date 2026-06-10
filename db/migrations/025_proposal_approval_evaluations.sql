-- 025: Explicit approval evaluation records for mission proposals.
--
-- Proposal creation remains an intake write. Auto-approval and hold decisions are
-- recorded here as first-class policy evaluations before any proposal status or
-- mission state is mutated.

CREATE TABLE IF NOT EXISTS ops_proposal_approval_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES ops_mission_proposals(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('approved', 'held_for_review', 'pending_review')),
  reason TEXT NOT NULL,
  auto_approve_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  trusted_source BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_step_kinds JSONB NOT NULL DEFAULT '[]',
  protected_step_kinds JSONB NOT NULL DEFAULT '[]',
  proposed_step_kinds JSONB NOT NULL DEFAULT '[]',
  blocked_step_kinds JSONB NOT NULL DEFAULT '[]',
  step_decisions JSONB NOT NULL DEFAULT '{}',
  decision JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_approval_evaluations_proposal
  ON ops_proposal_approval_evaluations (proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_approval_evaluations_outcome
  ON ops_proposal_approval_evaluations (outcome, created_at DESC);
