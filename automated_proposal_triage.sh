#!/bin/bash

# Automated Proposal Triage Script
# Categorizes proposals in /workspace/output/reviews by type and priority

PROPOSAL_DIR=/workspace/output/reviews
LOG_FILE=/workspace/output/reviews/triage_log_$(date +%Y%m%d%H%M%S).md

echo "| Timestamp | Proposal | Action | Reason |" > $LOG_FILE

cd $PROPOSAL_DIR

for file in *.md; do
  # Basic categorization based on filename patterns
  if [[ $file == *"patch_code"* ]]; then
    echo "| $(date) | $file | Code Patch | Matches patch_code pattern |" >> $LOG_FILE
    # Example action: move to code_patches directory
    # mkdir -p ../code_patches && mv $file ../code_patches/
  elif [[ $file == *"audit"* ]]; then
    echo "| $(date) | $file | Audit | Contains audit in filename |" >> $LOG_FILE
    # Example action: flag for security review
    # echo "SECURITY_REVIEW_NEEDED: $file" > ../security_flags/$file
  elif [[ $file == *"policy"* ]]; then
    echo "| $(date) | $file | Policy Change | Contains policy in filename |" >> $LOG_FILE
    # Example action: send to governance queue
    # mv $file ../governance_queue/
  else
    echo "| $(date) | $file | Unclassified | No matching pattern |" >> $LOG_FILE
  fi
 done

echo "Triage complete. Log saved to: $LOG_FILE"