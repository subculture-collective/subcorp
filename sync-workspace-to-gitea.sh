#!/bin/bash
# sync-workspace-to-gitea.sh
# Sync individual project repos to Gitea

PROJECT_ORG="SubCorp-LLC"
GITEA_TOKEN="$GITEA_TOKEN"
WORKSPACE_PATH="/workspace/projects"

if [ -z "$GITEA_TOKEN" ]; then
  echo "Error: GITEA_TOKEN environment variable not set" >&2
  exit 1
fi

# Clone or update the platform repo if needed
PLATFORM_REPO="subculture-collective/subcorp"
PLATFORM_PATH="$WORKSPACE_PATH/$PLATFORM_REPO"

if [ ! -d "$PLATFORM_PATH" ]; then
  git clone "https://$GITEA_TOKEN@git.subcult.tv/$PLATFORM_REPO.git" "$PLATFORM_PATH"
fi

# Sync each project repo in the workspace
for PROJECT in "$WORKSPACE_PATH"/*; do
  if [ -d "$PROJECT" ]; then
    REPO_NAME="$(basename "$PROJECT")"
    REPO_URL="https://$GITEA_TOKEN@git.subcult.tv/$PROJECT_ORG/$REPO_NAME.git"

    # Create or update the repo on Gitea
    if [ ! -d "$PROJECT/.git" ]; then
      git init "$PROJECT"
      git -C "$PROJECT" remote add origin "$REPO_URL"
    else
      git -C "$PROJECT" remote set-url origin "$REPO_URL"
    fi

    # Push changes
    git -C "$PROJECT" add .
    git -C "$PROJECT" commit -m "Sync with workspace" || true
    git -C "$PROJECT" push -f origin master || true
  fi
done