-- 002: Agent system tables
-- Consolidated from: 014, 015, 012, 019, 035, 043

-- ── Agent Registry ──
CREATE TABLE IF NOT EXISTS ops_agent_registry (
  agent_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  system_directive TEXT NOT NULL,
  soul_summary TEXT,
  tone TEXT,
  signature_phrase TEXT,
  color TEXT DEFAULT '#808080',
  avatar_key TEXT,
  pixel_sprite_key TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure expanded role CHECK constraint (035)
ALTER TABLE ops_agent_registry DROP CONSTRAINT IF EXISTS ops_agent_registry_role_check;
ALTER TABLE ops_agent_registry ADD CONSTRAINT ops_agent_registry_role_check
    CHECK (role IN (
        'coordinator', 'analyst', 'protector', 'innovator', 'executor',
        'dispatcher', 'operations', 'sovereign',
        -- Extended roles for agent-designed agents
        'researcher', 'strategist', 'architect', 'mediator', 'chronicler',
        'sentinel', 'synthesizer', 'provocateur', 'curator', 'custom'
    ));

CREATE INDEX IF NOT EXISTS idx_agent_registry_active ON ops_agent_registry (active);
CREATE INDEX IF NOT EXISTS idx_agent_registry_role ON ops_agent_registry (role);

-- ── Agent Config Variants ──
CREATE TABLE IF NOT EXISTS ops_agent_config_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES ops_agent_registry(agent_id),
  variant_name TEXT NOT NULL,
  config JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_config_variants_agent ON ops_agent_config_variants (agent_id);

-- ── Agent Skills ──
CREATE TABLE IF NOT EXISTS ops_agent_skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    TEXT NOT NULL CHECK (agent_id IN ('chora','subrosa','thaum','praxis','mux','primus')),
    skill_id    TEXT NOT NULL,
    skill_name  TEXT NOT NULL,
    description TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT true,
    config      JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_invocations   INTEGER NOT NULL DEFAULT 0,
    successful_invocations INTEGER NOT NULL DEFAULT 0,
    failed_invocations  INTEGER NOT NULL DEFAULT 0,
    last_invoked_at     TIMESTAMPTZ,
    avg_duration_ms     DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agent_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON ops_agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_skill ON ops_agent_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_enabled ON ops_agent_skills(agent_id, enabled);

-- ── Skill Executions ──
CREATE TABLE IF NOT EXISTS ops_skill_executions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    TEXT NOT NULL,
    skill_id    TEXT NOT NULL,
    session_id  UUID,
    params      JSONB NOT NULL DEFAULT '{}'::jsonb,
    result      JSONB,
    success     BOOLEAN NOT NULL,
    error       TEXT,
    duration_ms INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_executions_agent ON ops_skill_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON ops_skill_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_created ON ops_skill_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_executions_session ON ops_skill_executions(session_id) WHERE session_id IS NOT NULL;

-- Seed core skills for all agents
INSERT INTO ops_agent_skills (agent_id, skill_id, skill_name, description, enabled)
VALUES
    -- Core skills (all agents)
    ('chora', 'reflect-learn', 'Reflect & Learn', 'Pattern recognition from history', true),
    ('chora', 'thinking-partner', 'Thinking Partner', 'Collaborative ideation', true),
    ('chora', 'deep-research', 'Deep Research', 'Multi-step analysis', true),
    ('chora', 'humanizer', 'Humanizer', 'Natural writing', true),
    ('chora', 'prompt-guard', 'Prompt Guard', 'Security screening', true),

    ('subrosa', 'reflect-learn', 'Reflect & Learn', 'Pattern recognition from history', true),
    ('subrosa', 'thinking-partner', 'Thinking Partner', 'Collaborative ideation', true),
    ('subrosa', 'deep-research', 'Deep Research', 'Multi-step analysis', true),
    ('subrosa', 'humanizer', 'Humanizer', 'Natural writing', true),
    ('subrosa', 'prompt-guard', 'Prompt Guard', 'Security screening', true),

    ('thaum', 'reflect-learn', 'Reflect & Learn', 'Pattern recognition from history', true),
    ('thaum', 'thinking-partner', 'Thinking Partner', 'Collaborative ideation', true),
    ('thaum', 'deep-research', 'Deep Research', 'Multi-step analysis', true),
    ('thaum', 'humanizer', 'Humanizer', 'Natural writing', true),
    ('thaum', 'prompt-guard', 'Prompt Guard', 'Security screening', true),

    ('praxis', 'reflect-learn', 'Reflect & Learn', 'Pattern recognition from history', true),
    ('praxis', 'thinking-partner', 'Thinking Partner', 'Collaborative ideation', true),
    ('praxis', 'deep-research', 'Deep Research', 'Multi-step analysis', true),
    ('praxis', 'humanizer', 'Humanizer', 'Natural writing', true),
    ('praxis', 'prompt-guard', 'Prompt Guard', 'Security screening', true),

    ('mux', 'reflect-learn', 'Reflect & Learn', 'Pattern recognition from history', true),
    ('mux', 'thinking-partner', 'Thinking Partner', 'Collaborative ideation', true),
    ('mux', 'deep-research', 'Deep Research', 'Multi-step analysis', true),
    ('mux', 'humanizer', 'Humanizer', 'Natural writing', true),
    ('mux', 'prompt-guard', 'Prompt Guard', 'Security screening', true),

    ('primus', 'reflect-learn', 'Reflect & Learn', 'Pattern recognition from history', true),
    ('primus', 'thinking-partner', 'Thinking Partner', 'Collaborative ideation', true),
    ('primus', 'deep-research', 'Deep Research', 'Multi-step analysis', true),
    ('primus', 'humanizer', 'Humanizer', 'Natural writing', true),
    ('primus', 'prompt-guard', 'Prompt Guard', 'Security screening', true),

    -- Agent-specific skills
    ('chora', 'exa-web-search-free', 'Web Search', 'Search the web via Exa API', true),
    ('chora', 'summarize', 'Summarize', 'Summarize long content', true),
    ('chora', 'cost-report', 'Cost Report', 'Generate LLM/infrastructure cost reports', true),

    ('subrosa', 'security-audit', 'Security Audit', 'Comprehensive security scan', true),
    ('subrosa', 'clawdbot-security-suite', 'Security Suite', 'Full ClawdBot security suite', true),

    ('thaum', 'ai-persona-os', 'AI Persona OS', 'Create and manage AI personas', true),
    ('thaum', 'skill-creator', 'Skill Creator', 'Create new OpenClaw skills', true),

    ('praxis', 'git-essentials', 'Git Essentials', 'Git operations', true),
    ('praxis', 'twitter', 'Twitter / X', 'Twitter/X interactions', true),
    ('praxis', 'discord', 'Discord', 'Discord channel interactions', true),
    ('praxis', 'docker-essentials', 'Docker Essentials', 'Docker operations', true)
ON CONFLICT (agent_id, skill_id) DO NOTHING;

-- ── Agent Relationships ──
CREATE TABLE IF NOT EXISTS ops_agent_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_a TEXT NOT NULL,
    agent_b TEXT NOT NULL,
    affinity NUMERIC(3,2) NOT NULL DEFAULT 0.50,
    total_interactions INTEGER DEFAULT 0,
    positive_interactions INTEGER DEFAULT 0,
    negative_interactions INTEGER DEFAULT 0,
    drift_log JSONB DEFAULT '[]',
    UNIQUE(agent_a, agent_b),
    CHECK(agent_a < agent_b)
);

CREATE INDEX IF NOT EXISTS idx_relationships_agent_a ON ops_agent_relationships(agent_a);
CREATE INDEX IF NOT EXISTS idx_relationships_agent_b ON ops_agent_relationships(agent_b);
CREATE INDEX IF NOT EXISTS idx_relationships_affinity ON ops_agent_relationships(affinity);

-- ── Agent Sessions ──
-- source_id is TEXT (043: widened from UUID for droid IDs)
CREATE TABLE IF NOT EXISTS ops_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'cron',
    source_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'timed_out')),
    result JSONB,
    tool_calls JSONB DEFAULT '[]',
    llm_rounds INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd NUMERIC(10,6) DEFAULT 0,
    timeout_seconds INTEGER DEFAULT 300,
    max_tool_rounds INTEGER DEFAULT 15,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON ops_agent_sessions (status);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON ops_agent_sessions (agent_id, created_at DESC);
