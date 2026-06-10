-- 029: Database integrity gates for mission execution.
--
-- Adds DB-owned guardrails for valid status transitions, exclusive active
-- assignments, version-bound approval records, execution authority snapshots,
-- and retention classification on audit-bearing tables.

-- ── Version-bound approvals ──
ALTER TABLE ops_proposal_approval_evaluations
    ADD COLUMN IF NOT EXISTS proposal_revision TEXT,
    ADD COLUMN IF NOT EXISTS proposal_hash TEXT,
    ADD COLUMN IF NOT EXISTS policy_versions TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS retention_class TEXT NOT NULL DEFAULT 'approval_audit';

UPDATE ops_proposal_approval_evaluations
SET proposal_revision = COALESCE(proposal_revision, proposal_id::text || ':legacy'),
    proposal_hash = COALESCE(proposal_hash, 'legacy-' || id::text),
    policy_versions = CASE
        WHEN COALESCE(array_length(policy_versions, 1), 0) = 0 THEN ARRAY['legacy']::TEXT[]
        ELSE policy_versions
    END
WHERE proposal_revision IS NULL
   OR proposal_hash IS NULL
   OR COALESCE(array_length(policy_versions, 1), 0) = 0;

ALTER TABLE ops_proposal_approval_evaluations
    ALTER COLUMN proposal_revision SET NOT NULL,
    ALTER COLUMN proposal_hash SET NOT NULL;

ALTER TABLE ops_proposal_approval_evaluations
    DROP CONSTRAINT IF EXISTS ops_proposal_approval_evaluations_version_bound;
ALTER TABLE ops_proposal_approval_evaluations
    ADD CONSTRAINT ops_proposal_approval_evaluations_version_bound
    CHECK (
        proposal_revision <> ''
        AND proposal_hash <> ''
        AND array_length(policy_versions, 1) > 0
    );

ALTER TABLE ops_proposal_approval_evaluations
    DROP CONSTRAINT IF EXISTS ops_proposal_approval_evaluations_retention_class_check;
ALTER TABLE ops_proposal_approval_evaluations
    ADD CONSTRAINT ops_proposal_approval_evaluations_retention_class_check
    CHECK (retention_class IN ('approval_audit', 'security_audit', 'operational_audit', 'public_receipt'));

CREATE INDEX IF NOT EXISTS idx_proposal_approval_evaluations_version
    ON ops_proposal_approval_evaluations (proposal_id, proposal_revision, created_at DESC);

-- ── Authority snapshots + retention classes for execution evidence ──
ALTER TABLE ops_mission_step_execution_evidence
    ADD COLUMN IF NOT EXISTS authority_snapshot JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS retention_class TEXT NOT NULL DEFAULT 'operational_audit';

ALTER TABLE ops_mission_step_execution_evidence
    DROP CONSTRAINT IF EXISTS ops_step_execution_evidence_authority_snapshot_check;
ALTER TABLE ops_mission_step_execution_evidence
    ADD CONSTRAINT ops_step_execution_evidence_authority_snapshot_check
    CHECK (
        jsonb_typeof(authority_snapshot) = 'object'
        AND (
            authority_snapshot = '{}'::jsonb
            OR (
                COALESCE(authority_snapshot->>'proposalId', '') <> ''
                AND COALESCE(authority_snapshot->>'contractHash', '') = contract_hash
                AND COALESCE(authority_snapshot->>'approvalEvaluationId', '') <> ''
                AND COALESCE(authority_snapshot->>'outcome', '') IN ('ALLOW', 'DENY')
                AND COALESCE(authority_snapshot->>'checkedAt', '') <> ''
            )
        )
    );

ALTER TABLE ops_mission_step_execution_evidence
    DROP CONSTRAINT IF EXISTS ops_step_execution_evidence_retention_class_check;
ALTER TABLE ops_mission_step_execution_evidence
    ADD CONSTRAINT ops_step_execution_evidence_retention_class_check
    CHECK (retention_class IN ('operational_audit', 'approval_audit', 'security_audit', 'public_receipt'));

CREATE INDEX IF NOT EXISTS idx_step_execution_evidence_retention_class
    ON ops_mission_step_execution_evidence (retention_class, created_at DESC);

-- ── Retention class for signed authority events ──
ALTER TABLE ops_acl_grant_events
    ADD COLUMN IF NOT EXISTS retention_class TEXT NOT NULL DEFAULT 'security_audit';

ALTER TABLE ops_acl_grant_events
    DROP CONSTRAINT IF EXISTS ops_acl_grant_events_retention_class_check;
ALTER TABLE ops_acl_grant_events
    ADD CONSTRAINT ops_acl_grant_events_retention_class_check
    CHECK (retention_class IN ('security_audit', 'approval_audit', 'operational_audit'));

-- ── Exclusive active assignments ──
CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_mission_steps_active_assigned_agent
    ON ops_mission_steps (assigned_agent)
    WHERE assigned_agent IS NOT NULL AND status = 'running';

-- ── Valid status transitions ──
CREATE OR REPLACE FUNCTION enforce_ops_mission_status_transition()
RETURNS trigger AS $$
BEGIN
    IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF NOT (
        (OLD.status = 'approved' AND NEW.status IN ('running', 'succeeded', 'blocked', 'failed', 'cancelled')) OR
        (OLD.status = 'running' AND NEW.status IN ('succeeded', 'blocked', 'failed', 'cancelled')) OR
        (OLD.status = 'blocked' AND NEW.status IN ('running', 'failed', 'cancelled'))
    ) THEN
        RAISE EXCEPTION 'Invalid ops_missions status transition: % -> %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ops_missions_status_transition ON ops_missions;
CREATE TRIGGER trg_ops_missions_status_transition
    BEFORE UPDATE OF status ON ops_missions
    FOR EACH ROW EXECUTE FUNCTION enforce_ops_mission_status_transition();

CREATE OR REPLACE FUNCTION enforce_ops_mission_step_status_transition()
RETURNS trigger AS $$
BEGIN
    IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF NOT (
        (OLD.status = 'queued' AND NEW.status IN ('running', 'blocked', 'failed', 'skipped')) OR
        (OLD.status = 'running' AND NEW.status IN ('succeeded', 'blocked', 'failed', 'skipped')) OR
        (OLD.status = 'blocked' AND NEW.status IN ('queued', 'running', 'failed', 'skipped'))
    ) THEN
        RAISE EXCEPTION 'Invalid ops_mission_steps status transition: % -> %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ops_mission_steps_status_transition ON ops_mission_steps;
CREATE TRIGGER trg_ops_mission_steps_status_transition
    BEFORE UPDATE OF status ON ops_mission_steps
    FOR EACH ROW EXECUTE FUNCTION enforce_ops_mission_step_status_transition();
