-- Table Definition ----------------------------------------------

CREATE TABLE grant (
    "$id" integer DEFAULT nextval('"grant_$id_seq"'::regclass) PRIMARY KEY,
    "$replaced_by_$id" integer,
    "$created_at" timestamp without time zone,
    "$created_by_user_id" uuid
    id uuid,
    user_id uuid,
    client_id uuid,
    scopes text[],
    enabled boolean
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX grant_pkey ON grant("$id" int4_ops);
