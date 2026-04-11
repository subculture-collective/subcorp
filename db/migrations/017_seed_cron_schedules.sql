-- 017: Seed recurring cron schedules for autonomous agent routines.
-- Uses guarded INSERT ... SELECT ... WHERE NOT EXISTS because ops_cron_schedules
-- does not enforce unique(name).

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Morning Research Scan', 'chora', '0 12 * * *', 'America/Chicago', $$Search the web for the top AI and technology news from the last 24 hours. Focus on:
1. New model releases and benchmarks
2. Major product launches or acquisitions
3. Research paper breakthroughs
4. Open source project milestones
5. Regulatory or policy developments

Use web_search for 3-4 queries covering different angles. Summarize the top 5-7 stories with source URLs and a brief analysis of why each matters.$$,
300, 10, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Morning Research Scan');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Social & Market Scanner', 'chora', '0 13,23 * * *', 'America/Chicago', $$Search the web for trending social media discussions and market signals relevant to AI, technology, and culture. Look for:
1. Viral threads or discussions on AI/tech
2. Market movements in tech stocks or crypto
3. Cultural commentary on technology's impact
4. Emerging memes or narratives about AI

Use web_search for 2-3 targeted queries. Provide a concise signal report.$$,
240, 8, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Social & Market Scanner');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Daily Briefing', 'chora', '0 2 * * *', 'America/Chicago', $$Compile a daily briefing from today's research and scanning sessions. Use memory_search to find today's session outputs and synthesize them into:

1. **Top Stories**: 3-5 most important developments
2. **Signals**: Emerging trends or patterns
3. **Action Items**: Things worth tracking or acting on
4. **Outlook**: What to watch tomorrow

Write the briefing to /workspace/briefings/daily-briefing.md using file_write.$$,
300, 10, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Daily Briefing');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'AI & Tech Radar', 'chora', '0 17 * * *', 'America/Chicago', $$Deep scan for AI and technology developments. Search for:
1. New AI model releases, fine-tuning techniques, or inference optimizations
2. Developer tools, frameworks, or infrastructure updates
3. AI safety and alignment research
4. Edge computing, robotics, or hardware advances

Use web_search with 3-4 specific technical queries. Rate each finding's importance (1-5) and explain relevance.$$,
300, 10, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'AI & Tech Radar');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Subcult Watch', 'chora', '0 19 * * *', 'America/Chicago', $$Monitor for mentions and developments related to our brand and adjacent projects. Search for:
1. Any mentions of "subcult" in tech/AI contexts
2. Competitor activity in autonomous agent systems
3. Multi-agent framework developments
4. AI orchestration and workflow automation news

Use web_search for 2-3 targeted brand monitoring queries. Report findings with context.$$,
240, 8, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Subcult Watch');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Weekly Deep Digest', 'chora', '0 23 * * 0', 'America/Chicago', $$Compile a comprehensive weekly digest. Use memory_search to retrieve this week's daily briefings and session outputs. Synthesize into:

1. **Week in Review**: Major themes and developments
2. **Deep Analysis**: One topic deserving extended treatment
3. **Pattern Watch**: Recurring signals or emerging trends
4. **Strategic Notes**: Implications for our work
5. **Next Week Preview**: What to watch for

Write to /workspace/briefings/weekly-digest.md using file_write.$$,
600, 15, 'anthropic/claude-sonnet-4.5', true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Weekly Deep Digest');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Agent Dream', 'thaum', '0 8 * * *', 'America/Chicago', $$Creative cross-pollination session. Use memory_search to find interesting patterns, contradictions, or unexpected connections across all agents' recent memories.

Then, generate a brief "dream report" — a creative synthesis that:
1. Connects 2-3 seemingly unrelated observations
2. Proposes a novel reframe or metaphor
3. Identifies a question nobody has asked yet
4. Suggests one experimental direction

Keep it under 500 words. This is imagination, not analysis.$$,
300, 8, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Agent Dream');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Nightly Synthesis', 'chora', '0 11 * * *', 'America/Chicago', $$Memory consolidation run. Use memory_search to review the last 24 hours of agent memories. Look for:

1. Memories that should be updated or superseded
2. Patterns across different agents' observations
3. Lessons learned that should be elevated to strategy-level
4. Contradictions that need resolution

Provide a synthesis report of what you found and any recommended memory updates.$$,
300, 10, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Nightly Synthesis');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Federation Roundtable', 'primus', '0 21 * * 5', 'America/Chicago', $$It is time for the weekly federation roundtable. Review the week's agent activities using memory_search, then provide:

1. **Directive**: One strategic priority for next week
2. **Assessment**: How each agent performed this week (brief)
3. **Allocation**: Any role adjustments or focus shifts
4. **Question**: One question for the group to consider

Keep it under 300 words. Speak as Primus — cold, strategic, decisive.$$,
300, 8, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Federation Roundtable');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'CVE Security Check', 'subrosa', '30 12 * * *', 'America/Chicago', $$Security relevance check. Search for:
1. Critical CVEs published in the last 24 hours affecting Node.js, Docker, PostgreSQL, or Linux
2. Supply chain attacks or package compromises in npm/pip
3. AI-specific security threats (prompt injection, model extraction, etc.)

Use web_search for 2-3 security-focused queries. Report only findings with direct relevance to our stack. Rate severity (critical/high/medium/low).$$,
240, 8, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'CVE Security Check');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Calendar Briefing', 'mux', '0 12 * * *', 'America/Chicago', $$Check for today's scheduled events and deadlines. Use web_search to check for any major industry events, conferences, or deadlines happening today.

Provide a brief morning calendar-style briefing of what's relevant today.$$,
180, 6, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Calendar Briefing');

INSERT INTO ops_cron_schedules (name, agent_id, cron_expression, timezone, prompt, timeout_seconds, max_tool_rounds, model, enabled)
SELECT 'Email Triage', 'mux', '0 14 * * *', 'America/Chicago', $$Check for any important communications or notifications that need attention. Use web_search to check for service status pages of key dependencies (OpenRouter, GitHub, Vercel, Cloudflare).

Report any outages, maintenance windows, or status changes that affect our infrastructure.$$,
180, 6, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM ops_cron_schedules WHERE name = 'Email Triage');
