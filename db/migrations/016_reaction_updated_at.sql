-- 016: Add updated_at to reactions table

ALTER TABLE ops_agent_reactions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
