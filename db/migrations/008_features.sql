-- 008: Feature tables (RSS, newspaper, vetoes, initiative queue)
-- Consolidated from: 013, 044, 046, 048

-- ── RSS Feeds ──
CREATE TABLE IF NOT EXISTS ops_rss_feeds (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    url         TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL DEFAULT 'general',
    enabled     BOOLEAN NOT NULL DEFAULT true,
    last_fetched_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RSS Items ──
CREATE TABLE IF NOT EXISTS ops_rss_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id     UUID NOT NULL REFERENCES ops_rss_feeds(id) ON DELETE CASCADE,
    guid        TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    link        TEXT,
    pub_date    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(feed_id, guid)
);

CREATE INDEX IF NOT EXISTS idx_rss_items_pub_date ON ops_rss_items(pub_date DESC);

-- ── News Digests ──
CREATE TABLE IF NOT EXISTS ops_news_digests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot        TEXT NOT NULL,
    digest_date DATE NOT NULL,
    summary     TEXT NOT NULL,
    item_count  INTEGER NOT NULL DEFAULT 0,
    items       JSONB NOT NULL DEFAULT '[]',
    generated_by TEXT NOT NULL DEFAULT 'mux',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(digest_date, slot)
);

CREATE INDEX IF NOT EXISTS idx_news_digests_date ON ops_news_digests(digest_date DESC);

-- ── Newspaper Editions ──
CREATE TABLE IF NOT EXISTS ops_newspaper_editions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_date    DATE NOT NULL UNIQUE,
    headline        TEXT NOT NULL,
    summary         TEXT NOT NULL,
    article_count   INTEGER NOT NULL DEFAULT 0,
    articles        JSONB NOT NULL DEFAULT '[]',
    markdown_path   TEXT,
    pdf_path        TEXT,
    pdf_data        BYTEA,
    generated_by    TEXT NOT NULL DEFAULT 'system',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newspaper_editions_date ON ops_newspaper_editions (edition_date DESC);

-- ── Vetoes ──
CREATE TABLE IF NOT EXISTS ops_vetoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        TEXT NOT NULL,
    target_type     TEXT NOT NULL CHECK (target_type IN ('proposal', 'mission', 'governance', 'step')),
    target_id       UUID NOT NULL,
    reason          TEXT NOT NULL,
    severity        TEXT NOT NULL DEFAULT 'binding' CHECK (severity IN ('binding', 'soft')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'overridden', 'withdrawn', 'expired')),
    override_by     TEXT,
    override_reason TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vetoes_active_target ON ops_vetoes (target_type, target_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_vetoes_created ON ops_vetoes (created_at DESC);

-- Seed veto_authority policy
INSERT INTO ops_policy (key, value, description) VALUES (
    'veto_authority',
    '{
        "enabled": true,
        "binding_agents": ["subrosa"],
        "soft_veto_agents": ["chora", "thaum", "praxis", "mux", "primus"],
        "override_agents": ["primus"],
        "default_expiry_hours": 72,
        "protected_step_kinds": ["update_directive"]
    }'::jsonb,
    'Veto authority configuration — binding agents can halt proposals/missions, soft vetoes trigger review holds'
) ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ── Initiative Queue ──
CREATE TABLE IF NOT EXISTS ops_initiative_queue (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    context     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    result      JSONB
);

CREATE INDEX IF NOT EXISTS idx_initiative_queue_status_agent ON ops_initiative_queue (status, agent_id);
CREATE INDEX IF NOT EXISTS idx_initiative_queue_created ON ops_initiative_queue (created_at ASC) WHERE status = 'pending';
