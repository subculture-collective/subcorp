-- 012: Add workflow step kinds (draft_product_spec, update_directive, create_pull_request)
-- Also adds memory_archaeology to the CHECK constraint (was missing from 001).

ALTER TABLE ops_mission_steps DROP CONSTRAINT IF EXISTS ops_mission_steps_kind_check;
ALTER TABLE ops_mission_steps ADD CONSTRAINT ops_mission_steps_kind_check
  CHECK (kind IN (
    -- Research / analysis
    'analyze_discourse', 'scan_signals', 'research_topic', 'distill_insight',
    'classify_pattern', 'trace_incentive', 'identify_assumption',
    -- Content creation
    'draft_thread', 'draft_essay', 'critique_content', 'refine_narrative',
    'prepare_statement', 'write_issue',
    -- System / ops
    'audit_system', 'review_policy', 'consolidate_memory', 'map_dependency',
    'patch_code', 'document_lesson', 'log_event', 'tag_memory',
    'escalate_risk', 'convene_roundtable', 'propose_workflow',
    'memory_archaeology',
    -- Content pipeline
    'content_revision',
    -- Workflow step kinds (Phase 17)
    'draft_product_spec', 'update_directive', 'create_pull_request',
    -- Self-evolution & GitHub
    'self_evolution', 'github_issue', 'github_pr',
    'explore_repo', 'publish_blog', 'notify_human',
    -- Legacy kinds (kept for existing data)
    'draft_tweet', 'post_tweet', 'crawl', 'analyze',
    'write_content', 'research', 'deploy', 'review', 'summarize'
  ));
