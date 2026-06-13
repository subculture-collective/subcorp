#!/bin/bash
# Sync the shared agent workspace to Gitea.
#
# - Pushes a sanitized full-workspace snapshot to GITEA_WORKSPACE_REPO.
# - Pushes each /workspace/projects/* directory as its own Gitea repo.
# - Uses GITEA_TOKEN via askpass/curl; never embeds tokens in git remotes.

set -euo pipefail

MODE="${1:-all}" # all | workspace | projects

GITEA_BASE_URL="${GITEA_BASE_URL:-https://git.subcult.tv}"
GITEA_BASE_URL="${GITEA_BASE_URL%/}"
GITEA_API_URL="${GITEA_API_URL:-${GITEA_BASE_URL}/api/v1}"
GITEA_API_URL="${GITEA_API_URL%/}"
GITEA_ORG="${GITEA_ORG:-subculture-collective}"
GITEA_USERNAME="${GITEA_USERNAME:-x-access-token}"
AGENT_GIT_TOKEN="${GITEA_TOKEN:-${GITHUB_TOKEN:-}}"
GITEA_WORKSPACE_REPO="${GITEA_WORKSPACE_REPO:-subcorp-workspace}"
GITEA_WORKSPACE_PRIVATE="${GITEA_WORKSPACE_PRIVATE:-true}"
GITEA_PROJECT_PRIVATE="${GITEA_PROJECT_PRIVATE:-false}"
WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-/tmp/subcorp-workspace-snapshot}"
PROJECT_SNAPSHOT_ROOT="${PROJECT_SNAPSHOT_ROOT:-/tmp/subcorp-project-snapshots}"

SENSITIVE_FILE_NAMES=(
    '.env'
    '.npmrc'
    '.pypirc'
    '.netrc'
    'id_rsa'
    'id_dsa'
    'id_ecdsa'
    'id_ed25519'
)

EXCLUDE_PATHS=(
    '.env'
    '.env.*'
    '.ssh/'
    '.npmrc'
    '.pypirc'
    '.netrc'
    'id_rsa'
    'id_dsa'
    'id_ecdsa'
    'id_ed25519'
    '*.pem'
    '*.key'
    '*.p12'
    '*.pfx'
    'node_modules/'
    '.next/'
    'dist/'
    'build/'
    'coverage/'
    '.cache/'
)

if [ -z "$AGENT_GIT_TOKEN" ]; then
    echo "GITEA_TOKEN is required for workspace/project push" >&2
    exit 1
fi

export GITEA_BASE_URL GITEA_API_URL GITEA_ORG GITEA_USERNAME GITEA_TOKEN="${GITEA_TOKEN:-$AGENT_GIT_TOKEN}"
export GIT_ASKPASS="${GIT_ASKPASS:-/usr/local/bin/gitea-askpass}"
export GIT_TERMINAL_PROMPT=0

repo_slug() {
    printf '%s' "$1" \
        | tr '[:upper:]' '[:lower:]' \
        | tr -cs 'a-z0-9._-' '-' \
        | sed -E 's/^-+//; s/-+$//'
}

api_status() {
    local method="$1"
    local path="$2"
    local data="${3:-}"
    local response_file
    response_file="$(mktemp)"
    local code
    if [ -n "$data" ]; then
        code="$(curl -sS -o "$response_file" -w '%{http_code}' \
            -X "$method" \
            -H "Authorization: token ${AGENT_GIT_TOKEN}" \
            -H 'Content-Type: application/json' \
            --data "$data" \
            "${GITEA_API_URL}${path}")"
    else
        code="$(curl -sS -o "$response_file" -w '%{http_code}' \
            -X "$method" \
            -H "Authorization: token ${AGENT_GIT_TOKEN}" \
            "${GITEA_API_URL}${path}")"
    fi
    rm -f "$response_file"
    printf '%s' "$code"
}

ensure_repo() {
    local repo="$1"
    local private="$2"
    local code
    code="$(api_status GET "/repos/${GITEA_ORG}/${repo}")"
    if [ "$code" = "200" ]; then
        return 0
    fi
    if [ "$code" != "404" ]; then
        echo "Unable to inspect ${GITEA_ORG}/${repo}; Gitea returned HTTP ${code}" >&2
        exit 1
    fi

    local payload
    payload="$(jq -nc --arg name "$repo" --argjson private "$private" \
        '{name: $name, private: $private, auto_init: false}')"
    code="$(api_status POST "/orgs/${GITEA_ORG}/repos" "$payload")"
    if [ "$code" != "201" ] && [ "$code" != "409" ]; then
        echo "Unable to create ${GITEA_ORG}/${repo}; Gitea returned HTTP ${code}" >&2
        exit 1
    fi
}

remote_url() {
    local repo="$1"
    printf '%s/%s/%s.git' "$GITEA_BASE_URL" "$GITEA_ORG" "$repo"
}

ensure_gitignore() {
    local dir="$1"
    if [ -f "$dir/.gitignore" ]; then
        return 0
    fi
    cat > "$dir/.gitignore" <<'IGNORE'
.env
.env.*
**/.env
**/.env.*
node_modules/
**/node_modules/
.next/
**/.next/
dist/
**/dist/
build/
**/build/
coverage/
**/coverage/
.cache/
**/.cache/
.DS_Store
*.pem
*.key
*.p12
*.pfx
.ssh/
.npmrc
.pypirc
.netrc
id_rsa
id_dsa
id_ecdsa
id_ed25519
IGNORE
}

assert_no_sensitive_files() {
    local dir="$1"
    local matches
    matches="$(find "$dir" -name '.git' ! -path "$dir/.git" -print)"
    if [ -n "$matches" ]; then
        echo "Refusing to sync ${dir}; nested Git metadata found:" >&2
        printf '%s\n' "$matches" >&2
        exit 1
    fi

    matches="$(find "$dir" \
        -path '*/.git' -prune -o \
        -type f \( \
            \( -name '.env' ! -name '.env.example' \) -o \
            \( -name '.env.*' ! -name '.env.example' \) -o \
            -name '.npmrc' -o \
            -name '.pypirc' -o \
            -name '.netrc' -o \
            -name 'id_rsa' -o \
            -name 'id_dsa' -o \
            -name 'id_ecdsa' -o \
            -name 'id_ed25519' -o \
            -name '*.pem' -o \
            -name '*.key' -o \
            -name '*.p12' -o \
            -name '*.pfx' \
        \) -print)"
    if [ -n "$matches" ]; then
        echo "Refusing to sync ${dir}; sensitive-looking file(s) found:" >&2
        printf '%s\n' "$matches" >&2
        exit 1
    fi

    if [ -d "$dir/.git" ]; then
        matches="$(git -C "$dir" ls-files -- \
            '.env' '.env.*' '.npmrc' '.pypirc' '.netrc' \
            'id_rsa' 'id_dsa' 'id_ecdsa' 'id_ed25519' \
            '*.pem' '*.key' '*.p12' '*.pfx' \
            2>/dev/null | while IFS= read -r file; do \
                [ "$file" = '.env.example' ] && continue; \
                [ "${file##*/}" = '.env.example' ] && continue; \
                printf '%s\n' "$file"; \
            done || true)"
        if [ -n "$matches" ]; then
            echo "Refusing to sync ${dir}; sensitive-looking tracked file(s) found:" >&2
            printf '%s\n' "$matches" >&2
            exit 1
        fi
    fi

    matches="$(find "$dir" \
        -path '*/.git' -prune -o \
        \( -type d \( \
            -name 'node_modules' -o \
            -name '.next' -o \
            -name 'dist' -o \
            -name 'build' -o \
            -name 'coverage' -o \
            -name '.cache' \
        \) \) -print)"
    if [ -n "$matches" ]; then
        echo "Refusing to sync ${dir}; cache/build/dependency path(s) found:" >&2
        printf '%s\n' "$matches" >&2
        exit 1
    fi
}

git_add_safely() {
    local dir="$1"
    # Stage deletions of previously tracked excluded files after sanitized rsync.
    git -C "$dir" add -u
    git -C "$dir" add -A -- \
        . \
        ':!.env' \
        ':!.env.*' \
        ':!**/.env' \
        ':!**/.env.*' \
        ':!.ssh' \
        ':!**/.ssh' \
        ':!.npmrc' \
        ':!**/.npmrc' \
        ':!.pypirc' \
        ':!**/.pypirc' \
        ':!.netrc' \
        ':!**/.netrc' \
        ':!id_rsa' \
        ':!**/id_rsa' \
        ':!id_dsa' \
        ':!**/id_dsa' \
        ':!id_ecdsa' \
        ':!**/id_ecdsa' \
        ':!id_ed25519' \
        ':!**/id_ed25519' \
        ':!*.pem' \
        ':!**/*.pem' \
        ':!*.key' \
        ':!**/*.key' \
        ':!*.p12' \
        ':!**/*.p12' \
        ':!*.pfx' \
        ':!**/*.pfx' \
        ':!node_modules' \
        ':!**/node_modules' \
        ':!.next' \
        ':!**/.next' \
        ':!dist' \
        ':!**/dist' \
        ':!build' \
        ':!**/build' \
        ':!coverage' \
        ':!**/coverage' \
        ':!.cache' \
        ':!**/.cache'
    git -C "$dir" add .env.example '**/.env.example' >/dev/null 2>&1 || true
}

sync_git_dir() {
    local dir="$1"
    local repo="$2"
    local private="$3"
    local branch="${4:-main}"

    ensure_repo "$repo" "$private"
    ensure_gitignore "$dir"
    assert_no_sensitive_files "$dir"

    if [ ! -d "$dir/.git" ]; then
        git -C "$dir" init -q
    fi
    git -C "$dir" config user.email "agents@subcult.tv"
    git -C "$dir" config user.name "Subcorp Agents"
    git -C "$dir" checkout -B "$branch" >/dev/null 2>&1
    git -C "$dir" remote remove origin >/dev/null 2>&1 || true
    git -C "$dir" remote add origin "$(remote_url "$repo")"

    git_add_safely "$dir"
    if ! git -C "$dir" diff --cached --quiet; then
        git -C "$dir" commit -m "Sync workspace snapshot $(date -Iseconds)" >/dev/null
    fi
    git -C "$dir" push -u origin "$branch"
}

rsync_sanitized() {
    local source_dir="$1"
    local target_dir="$2"
    mkdir -p "$target_dir"

    local rsync_args=()
    for exclude in "${EXCLUDE_PATHS[@]}"; do
        rsync_args+=("--exclude=${exclude}")
    done
    rsync -a --delete --delete-excluded --filter='P /.git/' \
        --include='.env.example' --include='**/.env.example' \
        --exclude='.git/' --exclude='.git' "${rsync_args[@]}" \
        "$source_dir/" "$target_dir/"
    assert_no_sensitive_files "$target_dir"
}

prepare_sync_repo_dir() {
    local repo="$1"
    local branch="$2"
    local target_dir="$3"

    rm -rf "$target_dir"
    if git clone --quiet --branch "$branch" "$(remote_url "$repo")" "$target_dir" >/dev/null 2>&1; then
        return 0
    fi

    rm -rf "$target_dir"
    mkdir -p "$target_dir"
    git -C "$target_dir" init -q
}

sync_sanitized_source() {
    local source_dir="$1"
    local repo="$2"
    local private="$3"
    local branch="$4"
    local target_dir="$5"

    ensure_repo "$repo" "$private"
    prepare_sync_repo_dir "$repo" "$branch" "$target_dir"
    rsync_sanitized "$source_dir" "$target_dir"
    sync_git_dir "$target_dir" "$repo" "$private" "$branch"
}

sync_workspace() {
    ensure_repo "$GITEA_WORKSPACE_REPO" "$GITEA_WORKSPACE_PRIVATE"
    prepare_sync_repo_dir "$GITEA_WORKSPACE_REPO" main "$SNAPSHOT_DIR"
    rsync_sanitized "$WORKSPACE_DIR" "$SNAPSHOT_DIR"

    cat > "$SNAPSHOT_DIR/README.md" <<EOF
# Subcorp Agent Workspace Snapshot

This repository is an automated, sanitized snapshot of \\`/workspace\\`.

- Secrets, nested Git metadata, dependencies, caches, and build artifacts are excluded.
- Individual project repositories under \\`/workspace/projects/*\\` are also pushed separately.
- Source workspace: \\`${WORKSPACE_DIR}\\`
- Synced at: \\`$(date -Iseconds)\\`
EOF

    sync_git_dir "$SNAPSHOT_DIR" "$GITEA_WORKSPACE_REPO" "$GITEA_WORKSPACE_PRIVATE" main
}

sync_projects() {
    local project_root="${WORKSPACE_DIR}/projects"
    [ -d "$project_root" ] || return 0
    rm -rf "$PROJECT_SNAPSHOT_ROOT"
    mkdir -p "$PROJECT_SNAPSHOT_ROOT"
    for project_dir in "$project_root"/*; do
        [ -d "$project_dir" ] || continue
        local name repo branch
        name="$(basename "$project_dir")"
        repo="$(repo_slug "$name")"
        [ -n "$repo" ] || continue
        branch="$(git -C "$project_dir" symbolic-ref --short HEAD 2>/dev/null || printf 'main')"
        sync_sanitized_source "$project_dir" "$repo" "$GITEA_PROJECT_PRIVATE" "$branch" "${PROJECT_SNAPSHOT_ROOT}/${repo}"
    done
}

case "$MODE" in
    all)
        sync_workspace
        sync_projects
        ;;
    workspace)
        sync_workspace
        ;;
    projects)
        sync_projects
        ;;
    *)
        echo "Usage: sync-workspace-to-gitea.sh [all|workspace|projects]" >&2
        exit 2
        ;;
esac
