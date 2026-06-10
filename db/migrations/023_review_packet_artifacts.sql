-- 023: Review packet audit handles and versioned transition rules.
--
-- Existing review packets get stable artifact ids so downstream receipts can
-- reference a packet without guessing from subject type/id. Transition rules are
-- versioned separately from status so future workflow changes remain replayable.

ALTER TABLE ops_review_packets
  ADD COLUMN IF NOT EXISTS artifact_id TEXT,
  ADD COLUMN IF NOT EXISTS transition_rules_version INTEGER NOT NULL DEFAULT 1;

UPDATE ops_review_packets
SET artifact_id = CONCAT('review-packet:', subject_type, ':', subject_id)
WHERE artifact_id IS NULL;

ALTER TABLE ops_review_packets
  ALTER COLUMN artifact_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_packets_artifact_id ON ops_review_packets (artifact_id);
