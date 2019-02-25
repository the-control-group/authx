-- Table Definition ----------------------------------------------

CREATE TABLE credential (
    "$id" integer DEFAULT nextval('"credential_$id_seq"'::regclass) PRIMARY KEY,
    "$replaced_by_$id" integer,
    "$created_at" timestamp without time zone,
    "$created_by_user_id" uuid,
    id uuid,
    authority_id text,
    authority_user_id text,
    user_id uuid,
    enabled boolean
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX credential_pkey ON credential("$id" int4_ops);
