-- 020: Rebalance governance-vs-content trigger defaults.
-- Task 2.3 alignment update for trigger cooldowns and enablement.
--
-- Idempotent behavior:
-- - Updates only six named rows in ops_trigger_rules.
-- - Re-running applies the same target values without affecting other rows.

SELECT name, cooldown_minutes, enabled
FROM ops_trigger_rules
WHERE name IN (
    'Governance debate (All agents)',
    'Agent proposal voting trigger',
    'Proposal backlog monitor (Mux)',
    'Proactive content planning',
    'Proactive tweet drafting',
    'Proactive deep research'
)
ORDER BY name;

UPDATE ops_trigger_rules
SET cooldown_minutes = 720,
    enabled = true
WHERE name = 'Governance debate (All agents)';

UPDATE ops_trigger_rules
SET cooldown_minutes = 120,
    enabled = true
WHERE name = 'Agent proposal voting trigger';

UPDATE ops_trigger_rules
SET enabled = false
WHERE name = 'Proposal backlog monitor (Mux)';

UPDATE ops_trigger_rules
SET cooldown_minutes = 15
WHERE name = 'Proactive content planning';

UPDATE ops_trigger_rules
SET cooldown_minutes = 15
WHERE name = 'Proactive tweet drafting';

UPDATE ops_trigger_rules
SET cooldown_minutes = 15
WHERE name = 'Proactive deep research';

SELECT name, cooldown_minutes, enabled
FROM ops_trigger_rules
WHERE name IN (
    'Governance debate (All agents)',
    'Agent proposal voting trigger',
    'Proposal backlog monitor (Mux)',
    'Proactive content planning',
    'Proactive tweet drafting',
    'Proactive deep research'
)
ORDER BY name;
