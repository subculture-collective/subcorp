-- 018: Expire stale governance proposals.
-- Task 2.1 of the Autonomous Ops Alignment Remediation plan.
--
-- Idempotent behavior:
-- - Only proposals still in status='proposed' and older than 7 days are updated.
-- - Re-running this migration is safe; already-updated rows no longer match the WHERE clause.

SELECT COUNT(*) AS stale_proposals_before
FROM ops_governance_proposals
WHERE status = 'proposed'
  AND created_at < now() - interval '7 days';

WITH updated AS (
  UPDATE ops_governance_proposals
  SET status = 'rejected',
      resolved_at = now()
  WHERE status = 'proposed'
    AND created_at < now() - interval '7 days'
  RETURNING 1
)
SELECT COUNT(*) AS stale_proposals_affected
FROM updated;

SELECT COUNT(*) AS stale_proposals_after
FROM ops_governance_proposals
WHERE status = 'proposed'
  AND created_at < now() - interval '7 days';
