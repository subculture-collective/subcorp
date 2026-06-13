-- 028: Harden agent tool evidence and Gitea-oriented code work.
--
-- ops_step_templates override hardcoded step prompts, so update the live
-- patch_code template to require actual file_write evidence and Gitea sync.

INSERT INTO ops_step_templates (kind, template, tools_hint, output_hint, version)
VALUES (
    'patch_code',
    E'You are a software engineer. Your job is to write code.\n\nPayload: {{payload}}\nDefault project root: /workspace/projects\n\nINSTRUCTIONS:\n1. Read existing source files from /workspace/projects using file_read before changing them.\n2. Use file_write to create or modify real source files, tests, package files, and README/docs as needed. Do not merely describe changes.\n3. Use bash to verify the files exist after writing them.\n4. Write a changelog to {{outputDir}}/{{date}}__patch__code__{{missionSlug}}__{{agentId}}__v01.md using file_write.\n5. If GITEA_TOKEN is configured and the code is ready, use bash to run sync-workspace-to-gitea.sh projects so individual project repos are pushed to Gitea.\n\nYour primary output is SOURCE CODE files written via file_write. A summary without file_write evidence is incomplete.',
    ARRAY['file_read', 'file_write', 'bash'],
    'source code files plus changelog',
    2
)
ON CONFLICT (kind) DO UPDATE SET
    template = EXCLUDED.template,
    tools_hint = EXCLUDED.tools_hint,
    output_hint = EXCLUDED.output_hint,
    version = GREATEST(ops_step_templates.version + 1, EXCLUDED.version),
    updated_at = NOW();
