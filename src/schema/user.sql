-- Table Definition ----------------------------------------------

CREATE TABLE user (
    "$id" integer DEFAULT nextval('"user_$id_seq"'::regclass) PRIMARY KEY,
    "$replaced_by_$id" integer,
    "$created_at" timestamp without time zone,
    "$created_by_user_id" uuid,
    id uuid,
    type text,
    profile jsonb,
    enabled boolean
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX user_pkey ON user("$id" int4_ops);
