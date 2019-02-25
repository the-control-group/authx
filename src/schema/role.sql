-- Table Definition ----------------------------------------------

CREATE TABLE role (
    "$id" integer DEFAULT nextval('"role_$id_seq"'::regclass) PRIMARY KEY,
    "$replaced_by_$id" integer,
    "$created_at" timestamp without time zone,
    "$created_by_user_id" uuid,
    id uuid,
    name text,
    scopes text[],
    enabled boolean
    
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX role_pkey ON role("$id" int4_ops);
