-- Concurrency guards for replay/idempotency boundaries.
--
-- Workers can retry the same source job concurrently after restarts/backfills.
-- The application checks for an existing `(source, source_trace_id, title)`
-- before insert, but that SELECT is not a lock. These indexes make the replay
-- boundary durable at the database layer.

CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_mission_proposals_replay_key
    ON ops_mission_proposals (source, source_trace_id, title)
    WHERE source_trace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_missions_proposal_id
    ON ops_missions (proposal_id)
    WHERE proposal_id IS NOT NULL;
