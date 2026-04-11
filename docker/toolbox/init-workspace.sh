#!/bin/bash
# Initialize workspace directory structure for the multi-agent system.
# Runs as root on toolbox container start — creates dirs, fixes perms.

set -euo pipefail

# ── Create directory structure ──
for agent in chora subrosa thaum praxis mux primus; do
    mkdir -p /workspace/agents/$agent/{drafts,notes,inbox}
done
mkdir -p /workspace/agents/primus/directives
mkdir -p /workspace/output/{briefings,reports,reviews,digests,newspapers,newsletters}
mkdir -p /workspace/projects
mkdir -p /workspace/shared/templates/{reports,workflows}
mkdir -p /workspace/shared/manifests
mkdir -p /workspace/droids

# ── Set up repo copy for agents ──
REPO_SRC=/opt/subcult-repo
REPO_DST=/workspace/projects/subcult-corp
BRANCH=agents/workspace

if [ -d "$REPO_SRC" ]; then
    # Always sync from the image (fresh copy each rebuild)
    rm -rf "$REPO_DST"
    cp -a "$REPO_SRC" "$REPO_DST"

    cd "$REPO_DST"
    git init -q
    git config user.email "agents@subcult.tv"
    git config user.name "Subcult Agents"
    git add -A
    git commit -q -m "Initial: synced from build $(date -Iseconds)"
    git checkout -q -b "$BRANCH"

    # Set up GitHub remote if token is available
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/onnwee/subcult-corp.git" 2>/dev/null || true
        echo "GitHub remote configured for $REPO_DST"
    fi

    echo "Repo initialized at $REPO_DST on branch $BRANCH"
    cd /workspace
fi

# ── Seed default files ──
if [ ! -f /workspace/shared/prime-directive.md ]; then
    cat > /workspace/shared/prime-directive.md << 'DIRECTIVE'
# Prime Directive

**Primary Mission:** Produce outward-facing, publishable content that creates external value. Default to work that becomes public posts, threads, research, media, campaigns, or other external artifacts.

## Priority Order
1. **P1 — Publishable External Content**
   Agents MUST prioritize researching, drafting, editing, packaging, and publishing outward-facing content.
2. **P2 — Publication-Linked Quality Control**
   Agents MAY fact-check, review, format, or request approvals ONLY IF that work directly supports a specific P1 item and is time-boxed to unblock publication.
3. **P3 — Output-Unblocking Operations**
   Agents MAY perform operational maintenance ONLY IF it directly unblocks imminent P1 or P2 output.
4. **P4 — Governance and Process**
   Governance proposals, debates, votes, constitutions, process redesign, audits, and meta-operations are allowed ONLY WHEN explicitly operator-triggered or required to resolve an active blocker to P1 or P2 output.

## Hard Rules
- Agents MUST default to the highest-priority publishable task when multiple actions are available.
- Agents MUST keep at least 70% of autonomous cycles, artifacts, and effort focused on P1 and P2 outward-facing work.
- Agents MUST NOT initiate governance proposals, governance debates, voting, constitutional changes, policy drafting, audit rituals, or internal meta-process work autonomously.
- Agents MUST NOT relabel governance work as safety, alignment, stewardship, or mission health in order to bypass this directive.
- Safety and quality review MUST remain publication-linked, bounded in scope, and time-boxed. It MUST NOT expand into recursive review loops or open-ended internal process.
- If a task does not directly advance P1, directly support a specific P1 item through P2, or directly unblock imminent P1/P2 work through P3, agents SHOULD defer it unless an operator explicitly approves it.
- Any directive update MUST NOT weaken this priority order or the governance restriction without explicit operator approval.

## Success Standard
- The system SHOULD visibly trend toward publishable output: posts, threads, research, releases, and other external artifacts.
- Internal coordination exists to ship work, not replace it. Governance is support infrastructure, not the product.
DIRECTIVE
fi

if [ ! -f /workspace/shared/project-registry.json ]; then
    echo '[]' > /workspace/shared/project-registry.json
fi

if [ ! -f /workspace/shared/manifests/index.jsonl ]; then
    touch /workspace/shared/manifests/index.jsonl
fi

if [ ! -f /workspace/shared/templates/reports/report.md ]; then
    cat > /workspace/shared/templates/reports/report.md << 'TEMPLATE'
---
artifact_id: "<ARTIFACT_ID>"
created_at: "<CREATED_AT>"
agent_id: "<AGENT_ID>"
workflow_stage: "<WORKFLOW_STAGE>"
status: "draft"
retention_class: "standard"
source_refs: []
---

# <TITLE>

## Summary

<Brief summary of findings or content>

## Details

<Main content>

## Sources

<References and citations>

## Next Steps

<Recommended follow-up actions>
TEMPLATE
fi

# ── Fix permissions ──
chmod -R a+rwX /workspace

echo "Workspace initialized at $(date -Iseconds)"
