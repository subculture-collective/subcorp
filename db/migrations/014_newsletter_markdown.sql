-- 014: Add markdown_content column to newsletter editions
-- Persists the full markdown so it survives container rebuilds.

ALTER TABLE ops_newsletter_editions ADD COLUMN IF NOT EXISTS markdown_content TEXT;
