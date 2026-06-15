#!/bin/bash
# Audit metadata validation script
REQUIRED_FIELDS=("author" "timestamp" "checksum")
for file in /workspace/agents/praxis/notes/*.md; do
  missing=0
  for field in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -q "$field" "$file"; then
      missing=1
      echo "Missing $field in $file"
    fi
  done
  if [ $missing -eq 1 ]; then
    echo "Validation failed for $file"
  fi
done