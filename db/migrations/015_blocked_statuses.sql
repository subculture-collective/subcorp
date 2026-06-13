-- 015: Add blocked status for sessions, steps, and missions

-- ── ops_agent_sessions.status ──
ALTER TABLE ops_agent_sessions
DROP CONSTRAINT IF EXISTS ops_agent_sessions_status_check;

ALTER TABLE ops_agent_sessions
ADD CONSTRAINT ops_agent_sessions_status_check
CHECK (status IN ('pending', 'running', 'succeeded', 'blocked', 'failed', 'timed_out'));

-- ── ops_mission_steps.status ──
ALTER TABLE ops_mission_steps
DROP CONSTRAINT IF EXISTS ops_mission_steps_status_check;

ALTER TABLE ops_mission_steps
ADD CONSTRAINT ops_mission_steps_status_check
CHECK (status IN ('queued', 'running', 'succeeded', 'blocked', 'failed', 'skipped'));

-- ── ops_missions.status ──
ALTER TABLE ops_missions
DROP CONSTRAINT IF EXISTS ops_missions_status_check;

ALTER TABLE ops_missions
ADD CONSTRAINT ops_missions_status_check
CHECK (status IN ('approved', 'running', 'succeeded', 'blocked', 'failed', 'cancelled'));
