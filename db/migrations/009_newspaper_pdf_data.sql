-- 009: Store newspaper PDF binary in the database
-- Adds pdf_data BYTEA column so PDFs survive container rebuilds.
ALTER TABLE ops_newspaper_editions ADD COLUMN IF NOT EXISTS pdf_data BYTEA;
