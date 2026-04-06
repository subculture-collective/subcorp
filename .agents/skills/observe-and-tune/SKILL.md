---
name: observe-and-tune
description: Monitor a running system, assess output quality, and make targeted improvements on a recurring loop.
triggers:
  - observe
  - tune
  - monitor
  - loop
---

# Observe and Tune

Autonomous observation loop for monitoring and improving a running software system. Run on an interval to continuously assess health, output quality, and goal alignment — then make surgical fixes.

## Usage

```
/observe-and-tune                    # run one cycle now
/loop 60m /observe-and-tune          # run every hour
```

## Cycle Protocol

### 1. Query recent activity (last 60 min)

Check for active/completed work items, recent outputs, and system health. Identify bottlenecks: stuck processes, empty cycles, rate limits hit, errors in logs. Check throughput — is the system producing at a reasonable pace?

Use whatever query tools are available: database queries, API calls, log inspection, file system checks.

### 2. Assess output quality

Read 2-3 of the most recent artifacts or outputs. Ask:

- Is the output useful, concrete, and moving toward the project goals?
- Are there quality issues: empty responses, meta-commentary, circular patterns, errors?
- Is the system doing real work or just talking about doing work?
- Are outputs getting better or worse compared to previous cycles?

### 3. Report

Keep it brief and structured:

- **One paragraph**: what happened, what was produced, quality assessment
- **Score 1-10** on goal alignment (10 = pure progress, 1 = spinning wheels)
- **Bottlenecks**: list specific issues found, if any

### 4. Fix (only if needed)

Make the smallest change that addresses the biggest bottleneck:

- Adjust configuration, prompts, limits, or triggers via DB/config updates
- If code changes are needed: rebuild and redeploy only affected services
- Verify stability after any change

### 5. Log changes

Record what you changed and why. Future cycles depend on this context to avoid re-investigating solved problems or reverting fixes.

## Principles

- **Fix one thing per cycle, not five.** Observe the effect before changing more.
- **Distinguish root causes.** "System is broken" and "system works but output is bad" have different fixes.
- **Check logs before guessing.** The answer is usually in the error message.
- **Prefer config over code.** Configuration changes are cheap. Code changes require rebuilds.
- **Never change something you haven't read first.**
- **If nothing is wrong, say so and move on.** Not every cycle needs a fix.
- **Track cumulative changes.** After several cycles, summarize all changes made as a dev journal entry.
