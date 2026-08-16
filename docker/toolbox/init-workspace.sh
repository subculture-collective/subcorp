#!/bin/bash
# Initialize workspace directory structure for the multi-agent system.
# Runs as root on toolbox container start — creates dirs, fixes perms.

set -euo pipefail

GITEA_BASE_URL="${GITEA_BASE_URL:-https://git.subcult.tv}"
GITEA_ORG="${GITEA_ORG:-subculture-collective}"
GITEA_USERNAME="${GITEA_USERNAME:-x-access-token}"
AGENT_GIT_TOKEN="${GITEA_TOKEN:-${GITHUB_TOKEN:-}}"

# Configure non-interactive HTTPS auth for Gitea without embedding tokens in
# repository remotes. GITHUB_TOKEN is accepted only as a backward-compatible
# fallback for older deployments; prefer GITEA_TOKEN.
cat > /usr/local/bin/gitea-askpass << 'ASKPASS'
#!/bin/sh
case "$1" in
    *Username*) printf '%s\n' "${GITEA_USERNAME:-x-access-token}" ;;
    *Password*) printf '%s\n' "${GITEA_TOKEN:-${GITHUB_TOKEN:-}}" ;;
    *) printf '%s\n' "${GITEA_TOKEN:-${GITHUB_TOKEN:-}}" ;;
esac
ASKPASS
chmod 700 /usr/local/bin/gitea-askpass

cat > /etc/workspace-env.sh << 'ENVSH'
umask 0022
export PATH="/usr/local/bin:$PATH"
export GIT_ASKPASS=/usr/local/bin/gitea-askpass
export GIT_TERMINAL_PROMPT=0
ENVSH

git config --global user.email "agents@subcult.tv"
git config --global user.name "Subcorp Agents"
git config --global init.defaultBranch main
git config --global core.askPass /usr/local/bin/gitea-askpass

if command -v sync-workspace-to-gitea.sh >/dev/null 2>&1; then
    echo "Workspace sync helper available: /usr/local/bin/sync-workspace-to-gitea.sh"
else
    echo "Warning: sync-workspace-to-gitea.sh is missing from PATH" >&2
fi

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
REPO_SRC=/opt/subcorp-repo
REPO_DST=/workspace/projects/subcorp
BRANCH=agents/workspace

if [ -d "$REPO_SRC" ]; then
    # Always sync from the image (fresh copy each rebuild). Build the new copy
    # next to the old one and swap it into place so reruns don't fail if a
    # previous tree cannot be removed cleanly from the shared Docker volume.
    REPO_TMP="${REPO_DST}.tmp.$$"
    REPO_OLD="${REPO_DST}.old.$$"
    rm -rf "$REPO_TMP" "$REPO_OLD"
    cp -a "$REPO_SRC" "$REPO_TMP"
    if [ -e "$REPO_DST" ]; then
        mv "$REPO_DST" "$REPO_OLD"
    fi
    mv "$REPO_TMP" "$REPO_DST"
    if [ -e "$REPO_OLD" ]; then
        rm -rf "$REPO_OLD" 2>/dev/null || echo "Warning: could not fully remove $REPO_OLD; continuing with fresh repo copy"
    fi

    cd "$REPO_DST"
    git init -q
    git config user.email "agents@subcult.tv"
    git config user.name "Subcorp Agents"
    git add -A
    git commit -q -m "Initial: synced from build $(date -Iseconds)"
    git checkout -q -b "$BRANCH"

    # Set up tokenless Gitea remote. Authentication is supplied via askpass.
    git remote remove origin 2>/dev/null || true
    git remote add origin "${GITEA_BASE_URL}/${GITEA_ORG}/subcorp.git"
    if [ -n "$AGENT_GIT_TOKEN" ]; then
        echo "Gitea remote configured for $REPO_DST"
    else
        echo "Gitea remote configured for $REPO_DST (push disabled until GITEA_TOKEN is set)"
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
# App/worker containers run as nextjs:nodejs (1001:1001). Keep the shared
# workspace writable for the runtime owner without making artifacts
# world-writable; agent writers normalize individual artifacts to 0644.
chown -R 1001:1001 /workspace
chmod -R u+rwX,g+rwX,o+rX,o-w /workspace

echo "Workspace initialized at $(date -Iseconds)"
