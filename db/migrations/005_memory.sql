-- 005: Agent memory system
-- Consolidated from: 011, 020, 033, 036, 037

-- ── pgvector extension ──
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Agent Memory ──
-- Includes embedding column from 020
CREATE TABLE IF NOT EXISTS ops_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('insight', 'pattern', 'strategy', 'preference', 'lesson')),
  content TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.60,
  tags TEXT[] DEFAULT '{}',
  source_trace_id TEXT,
  superseded_by UUID REFERENCES ops_agent_memory(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  embedding vector(1024)
);

ALTER TABLE ops_agent_memory ADD COLUMN IF NOT EXISTS embedding vector(1024);

CREATE INDEX IF NOT EXISTS idx_memory_agent ON ops_agent_memory (agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON ops_agent_memory (agent_id, type);
CREATE INDEX IF NOT EXISTS idx_memory_confidence ON ops_agent_memory (confidence DESC);
CREATE INDEX IF NOT EXISTS idx_memory_tags ON ops_agent_memory USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_memory_source_trace ON ops_agent_memory (source_trace_id);
CREATE INDEX IF NOT EXISTS idx_memory_created ON ops_agent_memory (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON ops_agent_memory USING hnsw (embedding vector_cosine_ops);

-- ── Agent Scratchpad ──
CREATE TABLE IF NOT EXISTS ops_agent_scratchpad (
    agent_id TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Memory Archaeology ──
CREATE TABLE IF NOT EXISTS ops_memory_archaeology (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dig_id          UUID NOT NULL,
    agent_id        TEXT NOT NULL,
    finding_type    TEXT NOT NULL
                    CHECK (finding_type IN ('pattern', 'contradiction', 'emergence', 'echo', 'drift')),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    evidence        JSONB NOT NULL DEFAULT '[]',
    confidence      REAL NOT NULL DEFAULT 0.5,
    time_span       JSONB,
    related_agents  TEXT[] DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archaeology_dig ON ops_memory_archaeology(dig_id);
CREATE INDEX IF NOT EXISTS idx_archaeology_agent ON ops_memory_archaeology(agent_id);
CREATE INDEX IF NOT EXISTS idx_archaeology_type ON ops_memory_archaeology(finding_type);
CREATE INDEX IF NOT EXISTS idx_archaeology_created ON ops_memory_archaeology(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archaeology_evidence ON ops_memory_archaeology USING GIN (evidence);

-- ── Dream Cycles ──
CREATE TABLE IF NOT EXISTS ops_dream_cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        TEXT NOT NULL,
    source_memories UUID[] NOT NULL DEFAULT '{}',
    dream_content   TEXT NOT NULL,
    dream_type      TEXT NOT NULL CHECK (dream_type IN (
        'recombination', 'extrapolation', 'contradiction', 'synthesis'
    )),
    new_memory_id   UUID REFERENCES ops_agent_memory(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dream_cycles_agent ON ops_dream_cycles(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dream_cycles_type ON ops_dream_cycles(dream_type);
CREATE INDEX IF NOT EXISTS idx_dream_cycles_recent ON ops_dream_cycles(created_at DESC);
