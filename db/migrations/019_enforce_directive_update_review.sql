-- 019: Require review for directive update steps.
-- Task 2.2 runtime enforcement hardening for the Autonomous Ops Alignment Remediation plan.
--
-- Idempotent behavior:
-- - Removes update_directive from auto_approve.allowed_step_kinds only if present.
-- - Appends update_directive to veto_authority.protected_step_kinds only if missing.

SELECT key, value
FROM ops_policy
WHERE key IN ('auto_approve', 'veto_authority')
ORDER BY key;

UPDATE ops_policy
SET value = jsonb_set(
        value,
        '{allowed_step_kinds}',
        COALESCE(
            (
                SELECT jsonb_agg(step_kind ORDER BY ordinality)
                FROM jsonb_array_elements_text(
                    COALESCE(value->'allowed_step_kinds', '[]'::jsonb)
                ) WITH ORDINALITY AS allowed(step_kind, ordinality)
                WHERE step_kind <> 'update_directive'
            ),
            '[]'::jsonb
        ),
        true
    )
WHERE key = 'auto_approve'
  AND COALESCE(value->'allowed_step_kinds', '[]'::jsonb) @> '["update_directive"]'::jsonb;

UPDATE ops_policy
SET value = jsonb_set(
        value,
        '{protected_step_kinds}',
        COALESCE(value->'protected_step_kinds', '[]'::jsonb) || '["update_directive"]'::jsonb,
        true
    )
WHERE key = 'veto_authority'
  AND NOT COALESCE(value->'protected_step_kinds', '[]'::jsonb) @> '["update_directive"]'::jsonb;

SELECT key, value
FROM ops_policy
WHERE key IN ('auto_approve', 'veto_authority')
ORDER BY key;
