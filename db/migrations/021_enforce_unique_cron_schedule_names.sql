-- 021: Enforce unique cron schedule names.
--
-- Why:
-- - ops_cron_schedules historically allowed duplicate names.
-- - heartbeat scheduler iterates all enabled rows, so duplicate names can double-fire.
--
-- Behavior:
-- 1) Deduplicate by name, keeping the newest row (updated_at/created_at/id desc).
-- 2) Add a UNIQUE index on (name) to prevent recurrence.

WITH ranked AS (
    SELECT
        id,
        name,
        ROW_NUMBER() OVER (
            PARTITION BY name
            ORDER BY updated_at DESC, created_at DESC, id DESC
        ) AS rn
    FROM ops_cron_schedules
)
DELETE FROM ops_cron_schedules s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_cron_schedules_name
ON ops_cron_schedules (name);
