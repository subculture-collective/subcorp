-- 013: Store newspaper markdown content in the database
-- Markdown is the primary readable format; PDF is for download only.
ALTER TABLE ops_newspaper_editions ADD COLUMN IF NOT EXISTS markdown_content TEXT;
