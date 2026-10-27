module.exports=`
ALTER TABLE nexabot_public_releases ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS nexabot_config_versions(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,config JSONB NOT NULL,previous JSONB,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS nexabot_config_versions_guild ON nexabot_config_versions(guild_id,id DESC);
CREATE TABLE IF NOT EXISTS nexabot_intelligence_limits(guild_id TEXT NOT NULL,actor_id TEXT NOT NULL,window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),attempts INT NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,actor_id));
CREATE TABLE IF NOT EXISTS nexabot_intelligence_plans(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,actor_id TEXT NOT NULL,prompt TEXT NOT NULL,explanation TEXT NOT NULL,changes JSONB NOT NULL,base_hash TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'proposed',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),applied_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS nexabot_flows(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,actor_id TEXT NOT NULL,name TEXT NOT NULL,graph JSONB NOT NULL,enabled BOOLEAN NOT NULL DEFAULT FALSE,revision INT NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_flow_versions(id BIGSERIAL PRIMARY KEY,flow_id BIGINT NOT NULL REFERENCES nexabot_flows(id),revision INT NOT NULL,graph JSONB NOT NULL,actor_id TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(flow_id,revision));
CREATE TABLE IF NOT EXISTS nexabot_flow_runs(id BIGSERIAL PRIMARY KEY,flow_id BIGINT NOT NULL REFERENCES nexabot_flows(id),guild_id TEXT NOT NULL,event_key TEXT NOT NULL,subject_id TEXT NOT NULL,graph JSONB NOT NULL,node_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),lease_until TIMESTAMPTZ,error TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(flow_id,event_key));
CREATE INDEX IF NOT EXISTS nexabot_flow_runs_due ON nexabot_flow_runs(status,due_at);
CREATE TABLE IF NOT EXISTS nexabot_flow_steps(run_id BIGINT NOT NULL REFERENCES nexabot_flow_runs(id),node_id TEXT NOT NULL,result JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(run_id,node_id));
CREATE TABLE IF NOT EXISTS nexabot_release_catalog(version TEXT PRIMARY KEY,title TEXT NOT NULL,notes JSONB NOT NULL,notes_en JSONB NOT NULL DEFAULT '[]',modules JSONB NOT NULL DEFAULT '[]',visibility TEXT NOT NULL DEFAULT 'internal',kind TEXT NOT NULL DEFAULT 'feature',support_announcement BOOLEAN NOT NULL DEFAULT false,published_at TIMESTAMPTZ,created_by TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
ALTER TABLE nexabot_release_catalog ADD COLUMN IF NOT EXISTS notes_en JSONB NOT NULL DEFAULT '[]';
ALTER TABLE nexabot_release_catalog ADD COLUMN IF NOT EXISTS support_announcement BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS nexabot_staff_tasks(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,creator_id TEXT NOT NULL,assignee_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'open',revision INT NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
ALTER TABLE nexabot_staff_tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE nexabot_staff_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS nexabot_live_boards(guild_id TEXT PRIMARY KEY,category_id TEXT,channel_ids JSONB NOT NULL DEFAULT '{}',message_ids JSONB NOT NULL DEFAULT '{}',enabled BOOLEAN NOT NULL DEFAULT FALSE,last_refresh_at TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_security_events(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,event_key TEXT NOT NULL,kind TEXT NOT NULL,actor_id TEXT,target_id TEXT,detail JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(guild_id,event_key));
CREATE INDEX IF NOT EXISTS nexabot_security_events_guild ON nexabot_security_events(guild_id,id DESC);
ALTER TABLE nexabot_tickets ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE nexabot_tickets ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
ALTER TABLE nexabot_tickets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE nexabot_tickets ADD COLUMN IF NOT EXISTS linked_case BIGINT;
CREATE TABLE IF NOT EXISTS nexabot_slash_studio(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL,kind TEXT NOT NULL,payload JSONB NOT NULL,allowed_roles JSONB NOT NULL DEFAULT '[]',actor_id TEXT NOT NULL,discord_id TEXT,state TEXT NOT NULL DEFAULT 'pending',UNIQUE(guild_id,name));
CREATE TABLE IF NOT EXISTS nexabot_flow_templates(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,author_id TEXT NOT NULL,name TEXT NOT NULL,graph JSONB NOT NULL,state TEXT NOT NULL DEFAULT 'review',reviewer_id TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_events(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,creator_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL,capacity INT NOT NULL CHECK(capacity BETWEEN 1 AND 10000),signed_up INT NOT NULL DEFAULT 0,discord_event_id TEXT,discord_state TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_event_members(event_id BIGINT NOT NULL REFERENCES nexabot_events(id),user_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'joined',attended BOOLEAN NOT NULL DEFAULT FALSE,rating INT CHECK(rating BETWEEN 1 AND 5),PRIMARY KEY(event_id,user_id));
CREATE OR REPLACE FUNCTION nexabot_event_rsvp(g TEXT,e BIGINT,u TEXT,joining BOOLEAN) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE item nexabot_events%ROWTYPE; prior TEXT;
BEGIN
 SELECT * INTO item FROM nexabot_events WHERE id=e AND guild_id=g FOR UPDATE;
 IF NOT FOUND OR item.discord_state<>'synced' OR item.starts_at<=NOW() THEN RAISE EXCEPTION 'Event not open for registration'; END IF;
 SELECT status INTO prior FROM nexabot_event_members WHERE event_id=e AND user_id=u;
 IF joining AND prior IS DISTINCT FROM 'joined' THEN
  IF item.signed_up>=item.capacity THEN RAISE EXCEPTION 'Event participant limit reached'; END IF;
  INSERT INTO nexabot_event_members(event_id,user_id) VALUES(e,u) ON CONFLICT(event_id,user_id) DO UPDATE SET status='joined';
  UPDATE nexabot_events SET signed_up=signed_up+1 WHERE id=e;
 ELSIF NOT joining AND prior='joined' THEN
  UPDATE nexabot_event_members SET status='cancelled' WHERE event_id=e AND user_id=u;
  UPDATE nexabot_events SET signed_up=GREATEST(0,signed_up-1) WHERE id=e;
 END IF;
 RETURN jsonb_build_object('saved',true);
END $$;
CREATE TABLE IF NOT EXISTS nexabot_application_forms(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,creator_id TEXT NOT NULL,title TEXT NOT NULL,questions JSONB NOT NULL,role_id TEXT,closes_at TIMESTAMPTZ,enabled BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexabot_application_entries(id BIGSERIAL PRIMARY KEY,guild_id TEXT NOT NULL,form_id BIGINT NOT NULL REFERENCES nexabot_application_forms(id),user_id TEXT NOT NULL,answers JSONB NOT NULL,status TEXT NOT NULL DEFAULT 'pending',reviewer_id TEXT,review_note TEXT,interview_at TIMESTAMPTZ,request_key TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(guild_id,request_key));
CREATE INDEX IF NOT EXISTS nexabot_application_entries_guild ON nexabot_application_entries(guild_id,id DESC);
INSERT INTO nexabot_schema_migrations(version,name) VALUES(25,'nexa_next_generation') ON CONFLICT DO NOTHING;
`;
