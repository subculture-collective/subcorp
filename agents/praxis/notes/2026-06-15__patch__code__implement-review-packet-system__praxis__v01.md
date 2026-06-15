### Changelog: Implement Forewarning Templates in Review Packets

**Change:** Added `forewarningTemplate: string` field to `ReviewPacketInput` interface in `/workspace/projects/subcorp/src/lib/ops/review-packets.ts` to support pre-submission prompts.

**Grounding:**
- Modified file: `/workspace/projects/subcorp/src/lib/ops/review-packets.ts`
- Added `forewarningTemplate` property to `ReviewPacketInput` interface
- No existing logic requires modification for this schema change
- This enables future implementation of forewarning template integration in submission workflows