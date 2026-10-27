module.exports=`
CREATE TABLE IF NOT EXISTS nexabot_mdt_network_groups(
 guild_id TEXT PRIMARY KEY,config JSONB NOT NULL DEFAULT '{}'::jsonb,version INTEGER NOT NULL DEFAULT 1,
 password_salt TEXT,password_hash TEXT,password_revision INTEGER NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_mdt_network_members(
 guild_id TEXT NOT NULL,user_id TEXT NOT NULL,roblox_ids JSONB NOT NULL DEFAULT '[]'::jsonb,rank TEXT NOT NULL DEFAULT 'Állománytag',
 reviewer BOOLEAN NOT NULL DEFAULT FALSE,status TEXT NOT NULL DEFAULT 'active',updated_by TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS nexabot_mdt_character_profiles(
 id BIGSERIAL PRIMARY KEY,owner_id TEXT NOT NULL,name TEXT NOT NULL,fields JSONB NOT NULL,visibility TEXT NOT NULL DEFAULT 'community',
 status TEXT NOT NULL DEFAULT 'active',revision INTEGER NOT NULL DEFAULT 1,client_key TEXT NOT NULL,input_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(owner_id,client_key));
CREATE INDEX IF NOT EXISTS nexabot_mdt_character_owner ON nexabot_mdt_character_profiles(owner_id,id DESC);
CREATE TABLE IF NOT EXISTS nexabot_mdt_identity_cards(
 id BIGSERIAL PRIMARY KEY,character_id BIGINT NOT NULL REFERENCES nexabot_mdt_character_profiles(id),serial TEXT UNIQUE NOT NULL,
 guild_id TEXT NOT NULL,issued_by TEXT NOT NULL,snapshot JSONB NOT NULL,status TEXT NOT NULL DEFAULT 'issued',
 valid_until DATE NOT NULL,revoked_by TEXT,revoked_reason TEXT,revision INTEGER NOT NULL DEFAULT 1,client_key TEXT NOT NULL,input_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(issued_by,client_key));
CREATE TABLE IF NOT EXISTS nexabot_mdt_network_events(
 id BIGSERIAL PRIMARY KEY,guild_id TEXT,actor_id TEXT NOT NULL,action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT,metadata JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_mdt_network_auth_flows(
 id TEXT PRIMARY KEY,origin TEXT NOT NULL,challenge TEXT NOT NULL,client_state TEXT NOT NULL,user_data JSONB,code_hash TEXT UNIQUE,
 expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_mdt_network_web_sessions(
 token_hash TEXT PRIMARY KEY,user_data JSONB NOT NULL,csrf TEXT NOT NULL,unlocks JSONB NOT NULL DEFAULT '{}'::jsonb,
 expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_mdt_network_outbox(
 id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,channel_id TEXT,message_id TEXT,
 payload JSONB NOT NULL,revision INTEGER NOT NULL DEFAULT 1,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(entity_type,entity_id));
ALTER TABLE nexabot_mdt_network_outbox ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS nexabot_mdt_network_shared(record_id BIGINT PRIMARY KEY,guild_id TEXT NOT NULL,shared_by TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_mdt_network_locks(scope_key TEXT PRIMARY KEY,lease_token TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL);
`;
