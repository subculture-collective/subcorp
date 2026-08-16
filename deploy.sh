#!/usr/bin/env bash
set -Eeuo pipefail

# SUBCORP guarded deploy runner.
#
# This script deliberately has no --skip-preflight path. Production deployment is
# only reachable through the enforced gates below: receipt redaction, receipt
# schema validation, staging dry run, rollback proof, deploy, and canary
# verification.

SCRIPT_NAME="$(basename "$0")"
ENVIRONMENT="production"
COMMIT_HASH=""
RECEIPT_PATH=""
RECEIPT_SCHEMA_PATH="${DEPLOY_RECEIPT_SCHEMA:-receipt-schema.public.json}"
AUDIT_LOG=""
STAGING_DRY_RUN_COMMAND=""
ROLLBACK_COMMAND=""
ROLLBACK_PROOF_COMMAND=""
DEPLOY_COMMAND=""
CANARY_COMMAND=""
YES="false"

usage() {
    cat <<'USAGE'
Usage:
  ./deploy.sh \
    --receipt public/receipts/release.md \
    --receipt-schema receipt-schema.public.json \
    --audit-log output/deploy/audit.log \
    --staging-dry-run-command "make prod-verify" \
    --rollback-command "docker compose ... up -d <previous-image>" \
    --rollback-proof-command "./scripts/prove-rollback.sh --dry-run" \
    --deploy-command "make prod-rebuild" \
    --canary-command "curl -fsS https://subcorp.subcult.tv/api/health" \
    --commit "$(git rev-parse HEAD)" \
    --yes

Required gates:
  --receipt                    Public release receipt to scan before deployment.
  --receipt-schema             Public JSON schema path. Defaults to receipt-schema.public.json.
  --audit-log                  Append-only-ish local audit destination.
  --staging-dry-run-command    Command that proves staging can run safely.
  --rollback-command           Real rollback command, executed automatically if canary fails.
  --rollback-proof-command     Dry-run/proof command validating rollback viability before deploy.
  --deploy-command             Production deployment command.
  --canary-command             Post-deploy gate; failure triggers rollback and a non-zero exit.

Optional:
  --environment NAME           Defaults to production.
  --commit HASH                If provided, must match git HEAD before deploy.
  --yes                        Required acknowledgement for production deploys.
USAGE
}

die() {
    printf 'ERROR: %s\n' "$*" >&2
    audit "blocked" "$*"
    exit 1
}

timestamp() {
    date -u +'%Y-%m-%dT%H:%M:%SZ'
}

json_escape() {
    python3 -c 'import json,sys; print(json.dumps(sys.stdin.read())[1:-1])'
}

audit() {
    local event="$1"
    local detail="${2:-}"

    [[ -n "${AUDIT_LOG}" ]] || return 0
    mkdir -p "$(dirname "$AUDIT_LOG")"

    local escaped_detail escaped_receipt escaped_commit
    escaped_detail="$(printf '%s' "$detail" | json_escape)"
    escaped_receipt="$(printf '%s' "$RECEIPT_PATH" | json_escape)"
    escaped_commit="$(printf '%s' "$(current_commit 2>/dev/null || true)" | json_escape)"

    printf '{"ts":"%s","event":"%s","environment":"%s","commit":"%s","receipt":"%s","detail":"%s"}\n' \
        "$(timestamp)" "$event" "$ENVIRONMENT" "$escaped_commit" "$escaped_receipt" "$escaped_detail" >>"$AUDIT_LOG"
}

current_commit() {
    git rev-parse HEAD 2>/dev/null || printf 'unknown'
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

run_gate() {
    local name="$1"
    local command_text="$2"

    audit "gate_started" "$name"
    printf '==> %s\n' "$name"
    if bash -Eeuo pipefail -c "$command_text"; then
        audit "gate_passed" "$name"
    else
        die "gate failed: $name"
    fi
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --receipt) RECEIPT_PATH="${2:-}"; shift 2 ;;
            --receipt-schema) RECEIPT_SCHEMA_PATH="${2:-}"; shift 2 ;;
            --audit-log) AUDIT_LOG="${2:-}"; shift 2 ;;
            --staging-dry-run-command) STAGING_DRY_RUN_COMMAND="${2:-}"; shift 2 ;;
            --rollback-command) ROLLBACK_COMMAND="${2:-}"; shift 2 ;;
            --rollback-proof-command) ROLLBACK_PROOF_COMMAND="${2:-}"; shift 2 ;;
            --deploy-command) DEPLOY_COMMAND="${2:-}"; shift 2 ;;
            --canary-command) CANARY_COMMAND="${2:-}"; shift 2 ;;
            --environment) ENVIRONMENT="${2:-}"; shift 2 ;;
            --commit) COMMIT_HASH="${2:-}"; shift 2 ;;
            --yes) YES="true"; shift ;;
            -h|--help) usage; exit 0 ;;
            --skip-preflight|--no-preflight|--force)
                die "bypass flag rejected: $1"
                ;;
            *) die "unknown argument: $1" ;;
        esac
    done
}

validate_required_inputs() {
    [[ -n "$RECEIPT_PATH" ]] || die "--receipt is required"
    [[ -n "$AUDIT_LOG" ]] || die "--audit-log is required"
    [[ -n "$STAGING_DRY_RUN_COMMAND" ]] || die "--staging-dry-run-command is required"
    [[ -n "$ROLLBACK_COMMAND" ]] || die "--rollback-command is required"
    [[ -n "$ROLLBACK_PROOF_COMMAND" ]] || die "--rollback-proof-command is required"
    [[ -n "$DEPLOY_COMMAND" ]] || die "--deploy-command is required"
    [[ -n "$CANARY_COMMAND" ]] || die "--canary-command is required"
    [[ "$YES" == "true" ]] || die "production deploy requires --yes acknowledgement"
}

validate_commit() {
    [[ -n "$COMMIT_HASH" ]] || return 0
    local head
    head="$(current_commit)"
    [[ "$head" == "$COMMIT_HASH" ]] || die "commit mismatch: HEAD=$head expected=$COMMIT_HASH"
    audit "commit_verified" "$COMMIT_HASH"
}

scan_receipt_redaction() {
    [[ -f "$RECEIPT_PATH" ]] || die "receipt not found: $RECEIPT_PATH"
    [[ -s "$RECEIPT_PATH" ]] || die "receipt is empty: $RECEIPT_PATH"

    # Fail closed on common secret formats, private-key blocks, internal network
    # coordinates, raw env assignments, and bearer/basic auth material. Receipts
    # are public artifacts; deployment stops until they are redacted.
    local denylist_regex
    denylist_regex='(BEGIN (RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|Bearer[[:space:]]+[A-Za-z0-9._~+/=-]{12,}|Basic[[:space:]]+[A-Za-z0-9+/=]{12,}|(password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|database_url|cron_secret)[[:space:]]*[:=][[:space:]]*[^[:space:]]+|postgres(ql)?://[^[:space:]]+|mysql://[^[:space:]]+|redis://[^[:space:]]+|mongodb(\+srv)?://[^[:space:]]+|https?://[^[:space:]@]+:[^[:space:]@]+@|(^|[^0-9])(10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|192\.168\.[0-9]{1,3}\.[0-9]{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3})([^0-9]|$)|\b(localhost|127\.0\.0\.1|\.local|\.lan|\.internal)\b)'

    if grep -Ein "$denylist_regex" "$RECEIPT_PATH" >/tmp/deploy-receipt-denylist.$$; then
        cat /tmp/deploy-receipt-denylist.$$ >&2
        rm -f /tmp/deploy-receipt-denylist.$$
        die "receipt redaction failed; public receipt contains forbidden secret/internal material"
    fi
    rm -f /tmp/deploy-receipt-denylist.$$

    audit "gate_passed" "receipt_redaction"
}

validate_public_receipt() {
    [[ -f "$RECEIPT_PATH" ]] || die "receipt not found: $RECEIPT_PATH"
    [[ -f "$RECEIPT_SCHEMA_PATH" ]] || die "receipt schema not found: $RECEIPT_SCHEMA_PATH"

    python3 - "$RECEIPT_PATH" "$RECEIPT_SCHEMA_PATH" <<'PY'
import json
import re
import sys
from datetime import datetime
from pathlib import Path

receipt_path = Path(sys.argv[1])
schema_path = Path(sys.argv[2])

try:
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"receipt JSON validation failed: {exc}", file=sys.stderr)
    sys.exit(1)

errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

def non_empty_string(value):
    return isinstance(value, str) and len(value.strip()) > 0

def iso_datetime(value):
    if not isinstance(value, str):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False

allowed_top_level = set(schema.get("properties", {}).keys())
required_top_level = set(schema.get("required", []))
require(isinstance(receipt, dict), "receipt must be a JSON object")
if isinstance(receipt, dict):
    for key in sorted(required_top_level - receipt.keys()):
        errors.append(f"missing required field: {key}")
    for key in sorted(set(receipt.keys()) - allowed_top_level):
        errors.append(f"unexpected public receipt field: {key}")

    require(receipt.get("schema_version") == "1.0.0", "schema_version must be 1.0.0")
    require(re.match(r"^rcpt_[A-Za-z0-9][A-Za-z0-9_-]{7,}$", str(receipt.get("receipt_id", ""))) is not None, "receipt_id must match rcpt_* format")
    require(receipt.get("receipt_kind") in {"deployment", "rollback"}, "receipt_kind must be deployment or rollback")
    require(iso_datetime(receipt.get("created_at")), "created_at must be an ISO datetime")
    require(receipt.get("environment") in {"staging", "production"}, "environment must be staging or production")

    commit = receipt.get("commit")
    require(isinstance(commit, dict), "commit must be an object")
    if isinstance(commit, dict):
        require(re.match(r"^[0-9a-f]{40}$", str(commit.get("hash", ""))) is not None, "commit.hash must be a 40-char lowercase git SHA")
        require(non_empty_string(commit.get("repository")), "commit.repository is required")
        for key in set(commit.keys()) - {"hash", "repository", "public_ref"}:
            errors.append(f"unexpected commit field: {key}")

    outcome = receipt.get("outcome")
    require(isinstance(outcome, dict), "outcome must be an object")
    if isinstance(outcome, dict):
        require(outcome.get("status") in {"shipped", "blocked", "rolled_back", "failed"}, "outcome.status is invalid")
        require(non_empty_string(outcome.get("summary")), "outcome.summary is required")
        for key in set(outcome.keys()) - {"status", "summary", "stopped_by_gate"}:
            errors.append(f"unexpected outcome field: {key}")

    gates = receipt.get("gates")
    require(isinstance(gates, list) and len(gates) >= 1, "gates must be a non-empty array")
    required_gates = {"receipt_redaction", "staging_dry_run", "rollback_proof", "deploy", "canary"}
    seen_gates = set()
    if isinstance(gates, list):
        for i, gate in enumerate(gates):
            require(isinstance(gate, dict), f"gates[{i}] must be an object")
            if not isinstance(gate, dict):
                continue
            seen_gates.add(gate.get("name"))
            require(gate.get("name") in {"receipt_redaction", "staging_dry_run", "rollback_proof", "deploy", "canary", "rollback"}, f"gates[{i}].name is invalid")
            require(gate.get("status") in {"passed", "failed", "blocked", "not_run"}, f"gates[{i}].status is invalid")
            require(non_empty_string(gate.get("summary")), f"gates[{i}].summary is required")
            if "completed_at" in gate:
                require(iso_datetime(gate.get("completed_at")), f"gates[{i}].completed_at must be an ISO datetime")
            for key in set(gate.keys()) - {"name", "status", "summary", "completed_at"}:
                errors.append(f"unexpected gates[{i}] field: {key}")
    for gate_name in sorted(required_gates - seen_gates):
        errors.append(f"missing required deployment gate receipt: {gate_name}")

    rollback = receipt.get("rollback")
    require(isinstance(rollback, dict), "rollback must be an object")
    if isinstance(rollback, dict):
        require(isinstance(rollback.get("available"), bool), "rollback.available must be boolean")
        require(rollback.get("proof_status") in {"passed", "failed", "not_run"}, "rollback.proof_status is invalid")
        require(non_empty_string(rollback.get("summary")), "rollback.summary is required")
        if receipt.get("receipt_kind") == "deployment":
            require(rollback.get("available") is True, "deployment receipt requires rollback.available=true")
            require(rollback.get("proof_status") == "passed", "deployment receipt requires rollback.proof_status=passed")
        for key in set(rollback.keys()) - {"available", "proof_status", "executed", "summary"}:
            errors.append(f"unexpected rollback field: {key}")

    redaction = receipt.get("redaction")
    require(isinstance(redaction, dict), "redaction must be an object")
    required_checks = {"no_secrets", "no_tokens", "no_private_keys", "no_internal_hosts", "no_raw_env_values", "no_operator_credentials"}
    if isinstance(redaction, dict):
        checks = redaction.get("checks")
        require(redaction.get("status") == "passed", "redaction.status must be passed")
        require(isinstance(checks, list) and len(checks) >= 1, "redaction.checks must be non-empty")
        if isinstance(checks, list):
            unknown = set(checks) - required_checks
            missing = required_checks - set(checks)
            for check in sorted(unknown):
                errors.append(f"unknown redaction check: {check}")
            for check in sorted(missing):
                errors.append(f"missing redaction check: {check}")
        require(non_empty_string(redaction.get("statement")), "redaction.statement is required")
        for key in set(redaction.keys()) - {"status", "checks", "statement"}:
            errors.append(f"unexpected redaction field: {key}")

if errors:
    print("receipt validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    sys.exit(1)
PY

    audit "gate_passed" "receipt_validation"
}

preflight() {
    require_command bash
    require_command git
    require_command grep
    require_command python3

    validate_required_inputs
    validate_commit

    audit "preflight_started" "non_bypassable"
    scan_receipt_redaction
    validate_public_receipt

    DEPLOY_DRY_RUN=1 DEPLOY_ENV=staging run_gate "staging_dry_run" "$STAGING_DRY_RUN_COMMAND"
    ROLLBACK_DRY_RUN=1 DEPLOY_ENV="$ENVIRONMENT" run_gate "rollback_proof" "$ROLLBACK_PROOF_COMMAND"
    audit "preflight_passed" "all gates passed"
}

rollback_after_canary_failure() {
    audit "rollback_started" "canary failed"
    printf '==> Canary failed. Executing rollback.\n' >&2
    if bash -Eeuo pipefail -c "$ROLLBACK_COMMAND"; then
        audit "rollback_succeeded" "canary failed"
    else
        audit "rollback_failed" "manual intervention required"
        printf 'ERROR: rollback command failed; manual intervention required.\n' >&2
    fi
}

deploy() {
    audit "deploy_started" "$DEPLOY_COMMAND"
    printf '==> deploy\n'
    bash -Eeuo pipefail -c "$DEPLOY_COMMAND"
    audit "deploy_finished" "$DEPLOY_COMMAND"

    audit "canary_started" "$CANARY_COMMAND"
    printf '==> canary\n'
    if bash -Eeuo pipefail -c "$CANARY_COMMAND"; then
        audit "canary_passed" "$CANARY_COMMAND"
        audit "deploy_succeeded" "complete"
        printf 'Deployment succeeded.\n'
    else
        audit "canary_failed" "$CANARY_COMMAND"
        rollback_after_canary_failure
        die "deployment failed canary gate"
    fi
}

main() {
    parse_args "$@"
    preflight
    deploy
}

main "$@"
