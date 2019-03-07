CREATE SCHEMA authx;



CREATE TABLE authx.authority ( id UUID PRIMARY KEY );
CREATE TABLE authx.client ( id UUID PRIMARY KEY );
CREATE TABLE authx.credential ( id UUID PRIMARY KEY );
CREATE TABLE authx.grant ( id UUID PRIMARY KEY );
CREATE TABLE authx.role ( id UUID PRIMARY KEY );
CREATE TABLE authx.user ( id UUID PRIMARY KEY );




CREATE TABLE authx.authority_record (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES authx.authority,
  replacement_id UUID DEFAULT NULL REFERENCES authx.authority_record DEFERRABLE INITIALLY DEFERRED,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_grant_id UUID NOT NULL REFERENCES authx.grant,

  strategy TEXT NOT NULL,
  name TEXT NOT NULL,
  details JSONB NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.authority_record USING BTREE (entity_id) WHERE replacement_id IS NULL;




CREATE TABLE authx.client_record (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES authx.client,
  replacement_id UUID DEFAULT NULL REFERENCES authx.client_record DEFERRABLE INITIALLY DEFERRED,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_grant_id UUID NOT NULL REFERENCES authx.grant,

  name TEXT NOT NULL,
  secret TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  base_urls TEXT[] NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.client_record USING BTREE (entity_id) WHERE replacement_id IS NULL;




CREATE TABLE authx.credential_record (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES authx.credential,
  replacement_id UUID DEFAULT NULL REFERENCES authx.credential_record DEFERRABLE INITIALLY DEFERRED,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_grant_id UUID NOT NULL REFERENCES authx.grant,

  authority_id UUID NOT NULL REFERENCES authx.authority,
  authority_user_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES authx.user,
  details JSONB NOT NULL,
  profile JSONB DEFAULT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.credential_record USING BTREE (entity_id) WHERE replacement_id IS NULL;
CREATE UNIQUE INDEX ON authx.credential_record USING BTREE (authority_id, authority_user_id) WHERE replacement_id IS NULL AND enabled = TRUE;




CREATE TABLE authx.grant_record (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES authx.grant,
  replacement_id UUID DEFAULT NULL REFERENCES authx.grant_record DEFERRABLE INITIALLY DEFERRED,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_grant_id UUID NOT NULL REFERENCES authx.grant,

  user_id UUID NOT NULL REFERENCES authx.user,
  client_id UUID NOT NULL REFERENCES authx.client,
  nonce TEXT DEFAULT NULL,
  refresh_token TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.grant_record USING BTREE (entity_id) WHERE replacement_id IS NULL;
CREATE UNIQUE INDEX ON authx.grant_record USING BTREE (user_id, client_id) WHERE replacement_id IS NULL AND enabled = TRUE;




CREATE TABLE authx.role_record (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES authx.role,
  replacement_id UUID DEFAULT NULL REFERENCES authx.role_record DEFERRABLE INITIALLY DEFERRED,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_grant_id UUID NOT NULL REFERENCES authx.grant,

  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.role_record USING BTREE (entity_id) WHERE replacement_id IS NULL;

CREATE TABLE authx.role_record_assignment (
    role_record_id UUID NOT NULL REFERENCES authx.role_record,
    user_id UUID REFERENCES authx.user,
    PRIMARY KEY(role_record_id, user_id)
);




CREATE TABLE authx.user_record (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES authx.user,
  replacement_id UUID DEFAULT NULL REFERENCES authx.user_record DEFERRABLE INITIALLY DEFERRED,

  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_grant_id UUID NOT NULL REFERENCES authx.grant,

  type TEXT NOT NULL,
  profile JSONB NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX ON authx.user_record USING BTREE (entity_id) WHERE replacement_id IS NULL;




