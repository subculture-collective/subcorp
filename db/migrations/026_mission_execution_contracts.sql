-- 026: Sealed execution contracts for proposal-derived missions.
--
-- The contract snapshots the approved proposal revision, proposal hash,
-- approval evaluation, approved steps, acceptance criteria, expiry, rationale,
-- approver metadata, beneficiary, and risk owner at mission creation time.
-- Workers can execute from this immutable boundary instead of mutable proposal
-- state.

ALTER TABLE ops_missions
  ADD COLUMN IF NOT EXISTS execution_contract JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ops_missions_proposal_execution_contract_required'
      AND conrelid = 'ops_missions'::regclass
  ) THEN
    ALTER TABLE ops_missions
      ADD CONSTRAINT ops_missions_proposal_execution_contract_required
      CHECK (
        proposal_id IS NULL
        OR (
          execution_contract IS NOT NULL
          AND jsonb_typeof(execution_contract) = 'object'
          AND execution_contract->>'schemaVersion' = '1'
          AND execution_contract->>'sealed' = 'true'
          AND COALESCE(execution_contract->>'contractHash', '') <> ''
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_missions_execution_contract_hash
  ON ops_missions ((execution_contract->>'contractHash'))
  WHERE execution_contract IS NOT NULL;
