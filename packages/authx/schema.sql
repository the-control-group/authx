CREATE SCHEMA authx;




-- Entities
-- ========

CREATE TABLE authx.entity (
  id UUID PRIMARY KEY,
  CHECK (false) NO INHERIT
);




CREATE TABLE authx.authority ( id UUID PRIMARY KEY ) INHERITS (authx.entity);
CREATE TABLE authx.client ( id UUID PRIMARY KEY ) INHERITS (authx.entity);
CREATE TABLE authx.credential ( id UUID PRIMARY KEY ) INHERITS (authx.entity);
CREATE TABLE authx.grant ( id UUID PRIMARY KEY ) INHERITS (authx.entity);
CREATE TABLE authx.role ( id UUID PRIMARY KEY ) INHERITS (authx.entity);
CREATE TABLE authx.session ( id UUID PRIMARY KEY ) INHERITS (authx.entity);
CREATE TABLE authx.token ( id UUID PRIMARY KEY ) INHERITS (authx.entity);
CREATE TABLE authx.user ( id UUID PRIMARY KEY ) INHERITS (authx.entity);




-- Records
-- =======

CREATE TABLE authx.record (
  record_id UUID PRIMARY KEY,
  replacement_record_id UUID DEFAULT NULL REFERENCES authx.record DEFERRABLE INITIALLY DEFERRED,
  entity_id UUID NOT NULL REFERENCES authx.entity,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_token_id UUID NOT NULL REFERENCES authx.token,
  enabled BOOLEAN NOT NULL,

  CHECK (false) NO INHERIT
);




CREATE TABLE authx.authority_record (
  strategy TEXT NOT NULL,
  name TEXT NOT NULL,
  details JSONB NOT NULL,

  PRIMARY KEY (record_id),
  FOREIGN KEY (replacement_record_id) REFERENCES authx.authority_record DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (entity_id) REFERENCES authx.authority,
  FOREIGN KEY (created_by_token_id) REFERENCES authx.token
) INHERITS (authx.record);

CREATE UNIQUE INDEX ON authx.authority_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;




CREATE TABLE authx.client_record (
  name TEXT NOT NULL,
  secrets TEXT[] NOT NULL,
  urls TEXT[] NOT NULL,

  PRIMARY KEY (record_id),
  FOREIGN KEY (replacement_record_id) REFERENCES authx.client_record DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (entity_id) REFERENCES authx.client,
  FOREIGN KEY (created_by_token_id) REFERENCES authx.token
) INHERITS (authx.record);

CREATE UNIQUE INDEX ON authx.client_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;

CREATE TABLE authx.client_record_user (
  client_record_id UUID NOT NULL REFERENCES authx.client_record,
  user_id UUID REFERENCES authx.user,
  PRIMARY KEY(client_record_id, user_id)
);




CREATE TABLE authx.credential_record (
  authority_id UUID NOT NULL REFERENCES authx.authority,
  authority_user_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES authx.user,
  details JSONB NOT NULL,
  contact JSONB DEFAULT NULL,

  PRIMARY KEY (record_id),
  FOREIGN KEY (replacement_record_id) REFERENCES authx.credential_record DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (entity_id) REFERENCES authx.credential,
  FOREIGN KEY (created_by_token_id) REFERENCES authx.token
) INHERITS (authx.record);

CREATE UNIQUE INDEX ON authx.credential_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;
CREATE UNIQUE INDEX ON authx.credential_record USING BTREE (authority_id, authority_user_id) WHERE replacement_record_id IS NULL AND enabled = TRUE;




CREATE TABLE authx.grant_record (
  user_id UUID NOT NULL REFERENCES authx.user,
  client_id UUID NOT NULL REFERENCES authx.client,
  secrets TEXT[] NOT NULL,
  codes TEXT[] NOT NULL,
  scopes TEXT[] NOT NULL,

  PRIMARY KEY (record_id),
  FOREIGN KEY (replacement_record_id) REFERENCES authx.grant_record DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (entity_id) REFERENCES authx.grant,
  FOREIGN KEY (created_by_token_id) REFERENCES authx.token
) INHERITS (authx.record);

CREATE UNIQUE INDEX ON authx.grant_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;
CREATE UNIQUE INDEX ON authx.grant_record USING BTREE (user_id, client_id) WHERE replacement_record_id IS NULL AND enabled = TRUE;




CREATE TABLE authx.role_record (
  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL,

  PRIMARY KEY (record_id),
  FOREIGN KEY (replacement_record_id) REFERENCES authx.role_record DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (entity_id) REFERENCES authx.role,
  FOREIGN KEY (created_by_token_id) REFERENCES authx.token
) INHERITS (authx.record);

CREATE UNIQUE INDEX ON authx.role_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;

CREATE TABLE authx.role_record_user (
  role_record_id UUID NOT NULL REFERENCES authx.role_record,
  user_id UUID REFERENCES authx.user,
  PRIMARY KEY(role_record_id, user_id)
);




CREATE TABLE authx.token_record (
  created_by_credential_id UUID DEFAULT NULL REFERENCES authx.credential,
  user_id UUID NOT NULL REFERENCES authx.user,
  grant_id UUID DEFAULT NULL REFERENCES authx.grant,
  secret TEXT NOT NULL,
  scopes TEXT[] NOT NULL,

  PRIMARY KEY (record_id),
  FOREIGN KEY (replacement_record_id) REFERENCES authx.token_record DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (entity_id) REFERENCES authx.token,
  FOREIGN KEY (created_by_token_id) REFERENCES authx.token
) INHERITS (authx.record);

CREATE UNIQUE INDEX ON authx.token_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;




CREATE TABLE authx.user_record (
  type TEXT NOT NULL,
  contact JSONB DEFAULT NULL,

  PRIMARY KEY (record_id),
  FOREIGN KEY (replacement_record_id) REFERENCES authx.user_record DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (entity_id) REFERENCES authx.user,
  FOREIGN KEY (created_by_token_id) REFERENCES authx.token
) INHERITS (authx.record);

CREATE UNIQUE INDEX ON authx.user_record USING BTREE (entity_id) WHERE replacement_record_id IS NULL;




