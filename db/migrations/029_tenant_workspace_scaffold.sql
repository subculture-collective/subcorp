-- 029: Single-tenant workspace scaffold
-- This does not make Subcorp multi-tenant. It records the current trusted
-- single-tenant boundary and adds IDs future migrations can expand safely.

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

INSERT INTO tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Subcorp Default Tenant', 'default')
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspaces (id, tenant_id, name, slug)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Subcorp Default Workspace',
    'default'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001',
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE ops_cron_schedules
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001',
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE ops_agent_sessions
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001',
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE TABLE IF NOT EXISTS user_workspace_memberships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('viewer', 'member', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_workspace ON user_sessions(tenant_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_ops_agent_sessions_tenant_workspace ON ops_agent_sessions(tenant_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_ops_cron_schedules_tenant_workspace ON ops_cron_schedules(tenant_id, workspace_id);
