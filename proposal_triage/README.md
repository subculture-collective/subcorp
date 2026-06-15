# Proposal Triage System

Automated system for categorizing, prioritizing, and routing proposals through Subcorp's workflow. Implements rules-based triage logic with status transitions.

## Key Features
- Required field validation (artifact path, author, version, etc.)
- Evidence-boundary compliance checks
- Auto-escalation for high-priority proposals
- Integration with Gitea for status updates

## Architecture
```
proposal_triage/
├── triage.go       # Core triage logic and rules
├── config.yaml     # Configuration settings
├── scan_proposals.sh # Script to process pending proposals
└── README.md       # Module documentation
```

## Usage
1. `./scan_proposals.sh` to process all pending proposals
2. Configure rules in `config.yaml`
3. Monitor status updates in Gitea