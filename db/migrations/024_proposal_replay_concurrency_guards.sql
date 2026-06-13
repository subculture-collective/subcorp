-- Concurrency guards for replay/idempotency boundaries.
--
-- Workers can retry the same source job concurrently after restarts/backfills.
-- The application checks for an existing `(source, source_trace_id, title)`
-- before insert, but that SELECT is not a lock. These indexes make the replay
-- boundary durable at the database layer.

-- Existing installs may already contain duplicate replay-key proposals from
-- pre-index concurrent replays. Keep every proposal row, but remove the replay
-- key from later duplicates so the partial unique index can be installed.
WITH duplicate_replay_keys AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY source, source_trace_id, title
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM ops_mission_proposals
    WHERE source_trace_id IS NOT NULL
)
UPDATE ops_mission_proposals p
SET source_trace_id = NULL
FROM duplicate_replay_keys d
WHERE p.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_mission_proposals_replay_key
    ON ops_mission_proposals (source, source_trace_id, title)
    WHERE source_trace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_missions_proposal_id
    ON ops_missions (proposal_id)
    WHERE proposal_id IS NOT NULL;
