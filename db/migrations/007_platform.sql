-- 007: Platform integration tables
-- Consolidated from: 017, 028 (model_routing+sanctum), 029a (deduped), 030, 038, 041 (fixed), 042, 045

-- ── Discord Channels ──
CREATE TABLE IF NOT EXISTS ops_discord_channels (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_channel_id  TEXT NOT NULL UNIQUE,
    discord_guild_id    TEXT NOT NULL,
    name                TEXT NOT NULL,
    category            TEXT NOT NULL,
    purpose             TEXT,
    webhook_id          TEXT,
    webhook_token       TEXT,
    enabled             BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ops_discord_channels ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_discord_channels_name ON ops_discord_channels (name);

-- ── LLM Usage ──
CREATE TABLE IF NOT EXISTS ops_llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd NUMERIC(10,6),
  agent_id TEXT,
  context TEXT NOT NULL,
  session_id UUID,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_agent ON ops_llm_usage (agent_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_model ON ops_llm_usage (model);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created ON ops_llm_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_context ON ops_llm_usage (context);

-- ── Auth: Users ──
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url  TEXT,
    role        TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor', 'member', 'admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- ── Auth: Credentials ──
CREATE TABLE IF NOT EXISTS user_credentials (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Auth: Sessions ──
CREATE TABLE IF NOT EXISTS user_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);

-- ── Auth: OAuth Accounts ──
CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_oauth_provider_account ON user_oauth_accounts (provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_user_id ON user_oauth_accounts (user_id);

-- ── Sanctum: Conversations ──
CREATE TABLE IF NOT EXISTS ops_sanctum_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT,
    mode TEXT NOT NULL DEFAULT 'open',
    target_agent TEXT,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sanctum_conv_user ON ops_sanctum_conversations(user_id, updated_at DESC);

-- ── Sanctum: Messages ──
CREATE TABLE IF NOT EXISTS ops_sanctum_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ops_sanctum_conversations(id),
    role TEXT NOT NULL,
    agent_id TEXT,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sanctum_msg_conv ON ops_sanctum_messages(conversation_id, created_at);
