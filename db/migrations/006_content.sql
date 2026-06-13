-- 006: Content pipeline, projects, templates, governance, agent proposals
-- Consolidated from: 021, 024, 031, 032, 034, 040, 026 (view)

-- ── Projects ──
CREATE TABLE IF NOT EXISTS ops_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('proposed', 'active', 'paused', 'completed', 'abandoned')),
    lead_agent TEXT NOT NULL,
    participants TEXT[] DEFAULT '{}',
    prime_directive TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON ops_projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_lead ON ops_projects (lead_agent);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON ops_projects (slug);

-- ── Content Drafts ──
-- Includes expanded content types from 040
CREATE TABLE IF NOT EXISTS ops_content_drafts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_agent    TEXT NOT NULL,
    content_type    TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected', 'published')),
    review_session_id UUID REFERENCES ops_roundtable_sessions(id),
    reviewer_notes  JSONB NOT NULL DEFAULT '[]',
    source_session_id UUID REFERENCES ops_roundtable_sessions(id),
    published_at    TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure expanded content_type CHECK (040)
ALTER TABLE ops_content_drafts DROP CONSTRAINT IF EXISTS ops_content_drafts_content_type_check;
ALTER TABLE ops_content_drafts ADD CONSTRAINT ops_content_drafts_content_type_check
    CHECK (content_type IN (
        'essay', 'thread', 'statement', 'poem', 'manifesto',
        'briefing', 'report', 'review', 'digest', 'plan'
    ));

CREATE INDEX IF NOT EXISTS idx_content_drafts_author ON ops_content_drafts (author_agent);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON ops_content_drafts (status);
CREATE INDEX IF NOT EXISTS idx_content_drafts_created ON ops_content_drafts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_drafts_source ON ops_content_drafts (source_session_id);

-- ── Step Templates ──
CREATE TABLE IF NOT EXISTS ops_step_templates (
    kind        TEXT PRIMARY KEY,
    template    TEXT NOT NULL,
    tools_hint  TEXT[] DEFAULT '{}',
    output_hint TEXT,
    version     INT DEFAULT 1,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed all 23 step kinds with templates
INSERT INTO ops_step_templates (kind, template, tools_hint, output_hint) VALUES

-- Existing step kinds (ported from STEP_INSTRUCTIONS)

('research_topic',
 E'Use web_search to research the topic described in the payload.\nSearch for 3-5 relevant queries to build a comprehensive picture.\nUse web_fetch to read the most relevant pages.\nWrite your research notes to {{outputDir}}/{{date}}__research__notes__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nInclude: key findings, sources, quotes, and your analysis.',
 ARRAY['web_search', 'web_fetch', 'file_write', 'file_read'],
 'research notes markdown'),

('scan_signals',
 E'Use web_search to scan for signals related to the payload topic.\nLook for recent developments, trends, and notable changes.\nWrite a signal report to {{outputDir}}/{{date}}__scan__signals__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nFormat: bullet points grouped by signal type (opportunity, threat, trend, noise).',
 ARRAY['web_search', 'web_fetch', 'file_write'],
 'signal report markdown'),

('draft_essay',
 E'Read any research notes from agents/{{agentId}}/notes/ using file_read.\nDraft an essay based on the payload and your research.\nWrite the draft to output/reports/{{date}}__draft__essay__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nInclude YAML front matter with artifact_id, created_at, agent_id, workflow_stage: "draft", status: "draft".',
 ARRAY['file_read', 'file_write'],
 'essay draft markdown'),

('draft_thread',
 E'Read any research notes from agents/{{agentId}}/notes/ using file_read.\nDraft a concise thread (5-10 punchy points) based on the payload.\nWrite to output/reports/{{date}}__draft__thread__{{missionSlug}}__{{agentId}}__v01.md using file_write.',
 ARRAY['file_read', 'file_write'],
 'thread draft markdown'),

('critique_content',
 E'Read the artifact or content referenced in the payload using file_read.\nWrite a structured critique to output/reviews/{{date}}__critique__review__{{missionSlug}}__{{agentId}}__v01.md.\nCover: strengths, weaknesses, factual accuracy, tone, suggestions for improvement.',
 ARRAY['file_read', 'file_write'],
 'critique review markdown'),

('audit_system',
 E'Use bash to run system checks relevant to the payload.\nCheck file permissions, exposed ports, running services, or whatever the payload specifies.\nWrite findings to output/reviews/{{date}}__audit__security__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nRate findings by severity: critical, high, medium, low, info.',
 ARRAY['bash', 'file_write', 'file_read'],
 'audit report markdown'),

('patch_code',
 E'Read the relevant source files from projects/ using file_read.\nUse bash to make code changes as described in the payload.\nWrite changed files using file_write to the projects/ directory.\nProvide a summary of all changes made and why.',
 ARRAY['file_read', 'file_write', 'bash'],
 'code patch'),

('distill_insight',
 E'Read recent outputs from output/ and agents/{{agentId}}/notes/ using file_read.\nSynthesize into a concise digest of key insights.\nWrite to output/digests/{{date}}__distill__insight__{{missionSlug}}__{{agentId}}__v01.md using file_write.',
 ARRAY['file_read', 'file_write'],
 'insight digest markdown'),

('document_lesson',
 E'Document the lesson or knowledge described in the payload.\nWrite clear, reusable documentation to the appropriate projects/ docs/ directory.\nIf no specific project, write to output/reports/{{date}}__docs__lesson__{{missionSlug}}__{{agentId}}__v01.md.',
 ARRAY['file_read', 'file_write'],
 'lesson documentation markdown'),

('convene_roundtable',
 E'This step triggers a roundtable conversation.\nThe payload should specify the format and topic.\nProvide a summary of what the roundtable should discuss and why.',
 ARRAY['file_read'],
 'roundtable summary'),

('propose_workflow',
 E'Based on the payload, propose a multi-step workflow.\nEach step should specify: agent, step kind, and expected output.\nWrite the workflow proposal as a structured plan.',
 ARRAY['file_read', 'file_write'],
 'workflow proposal'),

-- New step kinds

('analyze_discourse',
 E'Analyze the discourse or conversation referenced in the payload.\nIdentify key themes, rhetorical patterns, power dynamics, and implicit assumptions.\nWrite your analysis to {{outputDir}}/{{date}}__analyze__discourse__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nStructure: themes, patterns, tensions, recommendations.',
 ARRAY['file_read', 'file_write'],
 'discourse analysis markdown'),

('classify_pattern',
 E'Examine the data or observations referenced in the payload.\nClassify recurring patterns by type: structural, behavioral, temporal, or emergent.\nWrite your classification to {{outputDir}}/{{date}}__classify__pattern__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nInclude confidence levels and supporting evidence for each pattern.',
 ARRAY['file_read', 'file_write'],
 'pattern classification markdown'),

('trace_incentive',
 E'Trace the incentive structures described in the payload.\nMap actors, their motivations, and how incentives align or conflict.\nWrite your analysis to {{outputDir}}/{{date}}__trace__incentive__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nInclude: actor map, incentive flows, misalignment risks.',
 ARRAY['file_read', 'file_write'],
 'incentive trace markdown'),

('identify_assumption',
 E'Identify and surface assumptions embedded in the payload context.\nFor each assumption: state it clearly, assess its validity, and note what breaks if it is wrong.\nWrite to {{outputDir}}/{{date}}__identify__assumption__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nRank assumptions by risk impact.',
 ARRAY['file_read', 'file_write'],
 'assumption analysis markdown'),

('refine_narrative',
 E'Refine the narrative or draft referenced in the payload.\nImprove clarity, coherence, and persuasive structure.\nPreserve the original voice and intent while tightening the argument.\nWrite the refined version to {{outputDir}}/{{date}}__refine__narrative__{{missionSlug}}__{{agentId}}__v01.md using file_write.',
 ARRAY['file_read', 'file_write'],
 'refined narrative markdown'),

('prepare_statement',
 E'Prepare a formal statement based on the payload context.\nEnsure accuracy, appropriate tone, and clear positioning.\nWrite to output/reports/{{date}}__prepare__statement__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nInclude: key message, supporting points, anticipated questions.',
 ARRAY['file_read', 'file_write'],
 'prepared statement markdown'),

('write_issue',
 E'Write a detailed issue report based on the payload.\nInclude: summary, reproduction steps (if applicable), expected vs actual behavior, impact assessment.\nWrite to {{outputDir}}/{{date}}__write__issue__{{missionSlug}}__{{agentId}}__v01.md using file_write.',
 ARRAY['file_read', 'file_write', 'bash'],
 'issue report markdown'),

('review_policy',
 E'Review the policy or governance item described in the payload.\nAssess alignment with stated goals, identify gaps, and suggest improvements.\nWrite your review to output/reviews/{{date}}__review__policy__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nStructure: current state, gaps, recommendations, risks.',
 ARRAY['file_read', 'file_write'],
 'policy review markdown'),

('consolidate_memory',
 E'Read recent agent memories and notes from agents/{{agentId}}/notes/ using file_read.\nIdentify overlapping or complementary insights and merge them into consolidated memories.\nWrite a consolidation report to {{outputDir}}/{{date}}__consolidate__memory__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nNote which memories were merged and which remain distinct.',
 ARRAY['file_read', 'file_write'],
 'memory consolidation report'),

('map_dependency',
 E'Map the dependencies described in the payload.\nIdentify: direct dependencies, transitive chains, circular risks, and critical paths.\nWrite your dependency map to {{outputDir}}/{{date}}__map__dependency__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nInclude a text-based diagram if helpful.',
 ARRAY['file_read', 'file_write', 'bash'],
 'dependency map markdown'),

('log_event',
 E'Log the event described in the payload with full context.\nCapture: what happened, when, who was involved, and immediate implications.\nWrite to {{outputDir}}/{{date}}__log__event__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nKeep it factual and timestamped.',
 ARRAY['file_write'],
 'event log entry'),

('tag_memory',
 E'Review and tag the memories or artifacts described in the payload.\nApply consistent, searchable tags based on content type, topic, and relevance.\nWrite your tagging report to {{outputDir}}/{{date}}__tag__memory__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nInclude: item, applied tags, reasoning.',
 ARRAY['file_read', 'file_write'],
 'memory tagging report'),

('escalate_risk',
 E'Assess and escalate the risk described in the payload.\nDetermine severity (critical/high/medium/low), blast radius, and recommended response.\nWrite your escalation report to output/reviews/{{date}}__escalate__risk__{{missionSlug}}__{{agentId}}__v01.md using file_write.\nInclude: risk summary, evidence, recommended actions, deadline for response.',
 ARRAY['file_read', 'file_write'],
 'risk escalation report')

ON CONFLICT (kind) DO NOTHING;

-- ── Governance Proposals ──
CREATE TABLE IF NOT EXISTS ops_governance_proposals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposer        TEXT NOT NULL,
    policy_key      TEXT NOT NULL,
    current_value   JSONB,
    proposed_value  JSONB NOT NULL,
    rationale       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'proposed'
                    CHECK (status IN ('proposed', 'voting', 'accepted', 'rejected')),
    votes           JSONB NOT NULL DEFAULT '{}',
    required_votes  INT NOT NULL DEFAULT 4,
    debate_session_id UUID REFERENCES ops_roundtable_sessions(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_governance_proposals_status ON ops_governance_proposals (status);
CREATE INDEX IF NOT EXISTS idx_governance_proposals_proposer ON ops_governance_proposals (proposer);
CREATE INDEX IF NOT EXISTS idx_governance_proposals_policy_key ON ops_governance_proposals (policy_key);
CREATE INDEX IF NOT EXISTS idx_governance_proposals_created_at ON ops_governance_proposals (created_at DESC);

-- ── Agent Proposals ──
CREATE TABLE IF NOT EXISTS ops_agent_proposals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposed_by     TEXT NOT NULL,
    agent_name      TEXT NOT NULL,
    agent_role      TEXT NOT NULL,
    personality     JSONB NOT NULL DEFAULT '{}',
    skills          JSONB NOT NULL DEFAULT '[]',
    rationale       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'proposed'
                    CHECK (status IN ('proposed', 'voting', 'approved', 'rejected', 'spawned')),
    votes           JSONB NOT NULL DEFAULT '{}',
    human_approved  BOOLEAN DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at      TIMESTAMPTZ,
    spawned_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_proposals_status ON ops_agent_proposals(status);
CREATE INDEX IF NOT EXISTS idx_agent_proposals_proposed_by ON ops_agent_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_agent_proposals_created_at ON ops_agent_proposals(created_at DESC);

-- ── Step Template Performance View (026) ──
CREATE OR REPLACE VIEW step_template_performance AS
SELECT
    kind,
    template_version,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'succeeded')::numeric
        / NULLIF(COUNT(*), 0) * 100
    ) as success_rate,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::int as avg_duration_secs
FROM ops_mission_steps
WHERE status IN ('succeeded', 'failed')
GROUP BY kind, template_version;
