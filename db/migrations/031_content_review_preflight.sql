-- 031: Content review preflight invalid-packet state

ALTER TABLE ops_content_drafts DROP CONSTRAINT IF EXISTS ops_content_drafts_status_check;
ALTER TABLE ops_content_drafts ADD CONSTRAINT ops_content_drafts_status_check
    CHECK (status IN ('draft', 'needs_revision', 'review', 'approved', 'rejected', 'published'));
