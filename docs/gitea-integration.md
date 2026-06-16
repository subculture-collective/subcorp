# Gitea Integration for Pending Proposals

## Overview
This document outlines the process for integrating pending proposals with Gitea, ensuring audit compliance and proper tracking.

## Steps to Integrate
1. **Configure GITEA_TOKEN**: Set the `GITEA_TOKEN` environment variable with your Gitea API token.
2. **Sync Workspace**: Run `sync-workspace-to-gitea.sh` to push project repos to the configured GITEA_PROJECT_ORG.
3. **Audit Checks**: Ensure all proposals have the following fields:
   - `evidence_URI`
   - `rollback_owner`
   - `blocked-state` metadata.
4. **Review Process**: All proposals must be reviewed by Subrosa before being marked as approved.

## Troubleshooting
- If sync fails, check token permissions and network access.
- Audit failures should be escalated to Subrosa for resolution.