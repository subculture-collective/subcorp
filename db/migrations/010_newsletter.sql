-- 010: SUBCULT Weekly newsletter editions
-- Internal weekly digest of office activity, missions, roundtable highlights, etc.

CREATE TABLE IF NOT EXISTS ops_newsletter_editions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_week    TEXT UNIQUE NOT NULL,          -- e.g. '2026-W08'
    edition_date    DATE NOT NULL,
    headline        TEXT NOT NULL,
    primus_message  TEXT,
    summary         TEXT,
    sections        JSONB DEFAULT '[]'::jsonb,
    stats           JSONB DEFAULT '{}'::jsonb,
    spotlight_agent TEXT,
    markdown_path   TEXT,
    pdf_path        TEXT,
    pdf_data        BYTEA,
    generated_by    TEXT DEFAULT 'mux',
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_editions_week
    ON ops_newsletter_editions (edition_week DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_editions_date
    ON ops_newsletter_editions (edition_date DESC);
