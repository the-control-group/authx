CREATE SCHEMA authx;



CREATE TABLE authx.authority ( id UUID PRIMARY KEY );
CREATE TABLE authx.client ( id UUID PRIMARY KEY );
CREATE TABLE authx.credential ( id UUID PRIMARY KEY );
CREATE TABLE authx.grant ( id UUID PRIMARY KEY );
CREATE TABLE authx.role ( id UUID PRIMARY KEY );
CREATE TABLE authx.session ( id UUID PRIMARY KEY );
CREATE TABLE authx.user ( id UUID PRIMARY KEY );




CREATE TABLE authx.authority_record (
  record_id UUID PRIMARY KEY,
  replacement_record_id UUID DEFAULT NULL REFERENCES authx.authority_record DEFERRABLE INITIALLY DEFERRED,

  entity_id UUID NOT NULL REFERENCES authx.authority,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_session_id UUID NOT NULL REFERENCES authx.session,

  strategy TEXT NOT NULL,
  name TEXT NOT NULL,
  details JSONB NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.authority_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;




CREATE TABLE authx.client_record (
  record_id UUID PRIMARY KEY,
  replacement_record_id UUID DEFAULT NULL REFERENCES authx.client_record DEFERRABLE INITIALLY DEFERRED,

  entity_id UUID NOT NULL REFERENCES authx.client,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_session_id UUID NOT NULL REFERENCES authx.session,

  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  oauth_secret TEXT NOT NULL,
  oauth_urls TEXT[] NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.client_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;




CREATE TABLE authx.credential_record (
  record_id UUID PRIMARY KEY,
  replacement_record_id UUID DEFAULT NULL REFERENCES authx.credential_record DEFERRABLE INITIALLY DEFERRED,

  entity_id UUID NOT NULL REFERENCES authx.credential,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_session_id UUID NOT NULL REFERENCES authx.session,

  authority_id UUID NOT NULL REFERENCES authx.authority,
  authority_user_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES authx.user,
  details JSONB NOT NULL,
  profile JSONB DEFAULT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.credential_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;
CREATE UNIQUE INDEX ON authx.credential_record USING BTREE (authority_id, authority_user_id) WHERE replacement_record_id IS NULL AND enabled = TRUE;




CREATE TABLE authx.grant_record (
  record_id UUID PRIMARY KEY,
  replacement_record_id UUID DEFAULT NULL REFERENCES authx.grant_record DEFERRABLE INITIALLY DEFERRED,

  entity_id UUID NOT NULL REFERENCES authx.grant,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_session_id UUID NOT NULL REFERENCES authx.session,

  user_id UUID NOT NULL REFERENCES authx.user,
  client_id UUID NOT NULL REFERENCES authx.client,
  nonce TEXT DEFAULT NULL,
  refresh_token TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.grant_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;
CREATE UNIQUE INDEX ON authx.grant_record USING BTREE (user_id, client_id) WHERE replacement_record_id IS NULL AND enabled = TRUE;




CREATE TABLE authx.role_record (
  record_id UUID PRIMARY KEY,
  replacement_record_id UUID DEFAULT NULL REFERENCES authx.role_record DEFERRABLE INITIALLY DEFERRED,

  entity_id UUID NOT NULL REFERENCES authx.role,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_session_id UUID NOT NULL REFERENCES authx.session,

  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.role_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;

CREATE TABLE authx.role_record_assignment (
    role_record_id UUID NOT NULL REFERENCES authx.role_record,
    user_id UUID REFERENCES authx.user,
    PRIMARY KEY(role_record_id, user_id)
);




CREATE TABLE authx.session_record (
  record_id UUID PRIMARY KEY,
  replacement_record_id UUID DEFAULT NULL REFERENCES authx.session_record DEFERRABLE INITIALLY DEFERRED,

  entity_id UUID NOT NULL REFERENCES authx.session,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_session_id UUID NOT NULL REFERENCES authx.session,

  grant_id UUID NOT NULL REFERENCES authx.grant,
  scopes TEXT[] NOT NULL,
  -- remote_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.session_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;
-- CREATE UNIQUE INDEX ON authx.session_record USING BTREE (remote_id) WHERE replacement_record_id IS NULL AND enabled = TRUE;




CREATE TABLE authx.user_record (
  record_id UUID PRIMARY KEY,
  replacement_record_id UUID DEFAULT NULL REFERENCES authx.user_record DEFERRABLE INITIALLY DEFERRED,

  entity_id UUID NOT NULL REFERENCES authx.user,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_session_id UUID NOT NULL REFERENCES authx.session,

  type TEXT NOT NULL,
  profile JSONB NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.user_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;




