-- 011: Subscriber list for SUBCULT Weekly / Daily newsletters
CREATE TABLE IF NOT EXISTS ops_subscribers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'both'
                    CHECK (plan IN ('daily', 'weekly', 'both')),
    status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'unsubscribed')),
    source      TEXT NOT NULL DEFAULT 'website',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(email)
);

-- Index for future send-list queries
CREATE INDEX IF NOT EXISTS idx_subscribers_status_plan
    ON ops_subscribers (status, plan);
