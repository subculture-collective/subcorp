# Security Audit: synthetic fixture and disclosure checklist gate

Agent: Subrosa  
Date: 2026-06-10  
Mission step: `audit_system`  
Scope: `/home/onnwee/projects/subcorp/tests/fixtures/receipt-redaction-safe-split.json`, related receipt-redaction test, local path permissions, listening services, running Docker services.

## Verdict

VETO: do not publish this fixture/checklist artifact yet. The public receipt redaction proof passes, but the fixture is not marked synthetic from the first byte and no disclosure checklist artifact exists in the repo.  
FIX: add an adjacent disclosure checklist and make the fixture self-identify as synthetic before any realistic-looking receipt content appears. Then ship.

## System checks run

- `stat -c '%A %U:%G %n' ...`: repo, tests, fixtures, and output review paths are `onnwee:onnwee`; fixture is `-rw-rw-r--`; directories are group-writable.
- `ss -ltnup`: many services listen on `10.0.0.56:*`; SSH listens on `0.0.0.0:22`; local dev/opencode services listen on localhost and `0.0.0.0:4096`.
- `docker ps --format ...`: `subcorp-app` is running and exposed at `10.0.0.56:3010->3000/tcp`; `subcorp-sanctum` at `10.0.0.56:3018->3011/tcp`; worker/toolbox containers are running.
- `bun test tests/receipt-redaction-fixture.test.ts`: not runnable in this environment because `bun` is not installed.
- `node --input-type=module ...`: not runnable in this environment because `node` is not installed.
- `python3` JSON/redaction check: public receipt contains no configured forbidden substrings or forbidden regex matches; fixture has no top-level checklist/disclosure key; first byte is `{`; first 500 bytes do not contain a synthetic/fictional/example-only marker.

## Findings

### 1. High — fixture is not synthetic-marked from first byte

Evidence:
- `tests/fixtures/receipt-redaction-safe-split.json:1` starts directly with `{`.
- The first substantive field is `description`, but it describes redaction behavior, not that all data is synthetic from first byte.
- The first 500 bytes do not include `synthetic`, `fictional`, `not real`, or `example-only`.
- Realistic-looking values appear later: `sk_live_should_never_publish`, internal hostnames, internal email addresses, vault URIs, S3 audit locations, Grafana URL, and SSH deploy commands.

Risk: reviewers and downstream publishers can mistake the private receipt section for redacted production evidence or a sanitized copy of real infrastructure. That undermines disclosure, provenance, and safe publication.

Recommendation:
1. Add a first field before `description`, for example: `"fixture_notice": "SYNTHETIC_FIXTURE_FROM_FIRST_BYTE: all identifiers, commands, hosts, tokens, emails, audit locations, and evidence values are fictional test data."`
2. Rename realistic secrets away from live-token patterns where possible, or keep them only as explicit redaction sentinels with nearby synthetic labeling.
3. Add a test that reads the raw file and asserts the first meaningful property is the synthetic notice before `private_receipt` or any realistic-looking sentinel appears.

Ship path: one fixture-field addition plus one regression assertion is enough to unblock.

### 2. High — disclosure checklist is absent

Evidence:
- `glob **/*disclosure*` and `glob **/*checklist*` under `/home/onnwee/projects/subcorp` found no checklist artifact.
- `grep disclosure|checklist|absence|synthetic|fixture` found only references in briefing/review/test/code, not a checklist shipped beside the contract/fixture.
- The fixture top-level keys are only `description`, `schemas`, `private_receipt`, `public_receipt`, and `redaction_proof`.

Risk: absence is not reviewable. The artifact proves what the public receipt excludes, but it does not require a reviewer to attest that omitted private evidence is intentionally absent, synthetic, and not needed for publication.

Recommendation:
1. Add `docs/disclosure-checklists/receipt-redaction-safe-split.md` or `tests/fixtures/receipt-redaction-safe-split.disclosure-checklist.md` beside the fixture.
2. Checklist must include: synthetic-from-first-byte confirmation; no real customer/operator data; no real secrets; no real internal hostnames; public receipt excludes private commands/evidence locations; reviewable absence recorded; reviewer/date.
3. Add a test or CI check that fails when the fixture exists without its adjacent disclosure checklist.

Ship path: create the checklist in the same commit as the fixture and link it from the fixture metadata.

### 3. Info — public receipt redaction proof passes configured checks

Evidence:
- Python check found `publicForbiddenHits: []` for all configured `public_must_not_contain` strings.
- Python check found `publicPatternHits: []` for all configured `public_must_not_match` regexes.
- Existing test file `tests/receipt-redaction-fixture.test.ts` asserts preserved public fields, forbidden public substrings/patterns, and required rollback/redaction proof fields.

Risk: low for the public receipt split itself. The remaining issue is provenance/disclosure, not public redaction content.

Recommendation: keep the existing redaction assertions and extend them with synthetic-notice and checklist-existence assertions.

Ship path: retain current redaction proof; add provenance gates.

### 4. Low — fixture path is group-writable

Evidence:
- `/home/onnwee/projects/subcorp/tests/fixtures/receipt-redaction-safe-split.json` is `-rw-rw-r-- onnwee:onnwee`.
- Parent directories are `drwxrwxr-x onnwee:onnwee`.

Risk: any local user in group `onnwee` can modify the fixture/checklist before review. In a single-user workstation this is acceptable; in shared CI or shared host use, provenance can be weakened.

Recommendation: rely on git review for normal development. For release packaging, verify clean git status and artifact hash in CI.

Ship path: acceptable for local dev; add CI hash/checklist checks before public release.

### 5. Info — local service exposure does not change fixture verdict

Evidence:
- `subcorp-app` and many homelab services are bound on `10.0.0.56`.
- SSH listens on all interfaces.
- This audit did not observe the fixture being served publicly.

Risk: if an unauthenticated route exposes repo/test fixtures, the missing synthetic notice becomes externally visible and easier to misinterpret.

Recommendation: keep fixture/test directories out of public static serving paths; keep ops/admin services behind trusted network or auth.

Ship path: no blocker for the fixture artifact if publication gates above are fixed.

## Required fixes before publication

1. Add a first-position synthetic fixture notice before realistic-looking private receipt content.
2. Add an adjacent disclosure checklist that explicitly captures reviewable absence.
3. Add regression coverage for both: synthetic notice appears before private content, and checklist exists/contains required attestations.

## Safe-to-ship recommendation

Not safe to publish yet. Safe to ship after the notice and checklist are added. Current public redaction checks are sound; the missing gate is provenance and reviewable absence.
