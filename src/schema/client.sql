-- Table Definition ----------------------------------------------

CREATE TABLE client (
    "$id" integer DEFAULT nextval('"client_$id_seq"'::regclass) PRIMARY KEY,
    "$replaced_by_$id" integer,
    "$created_at" timestamp without time zone,
    "$created_by_user_id" uuid,
    id uuid,
    name text,
    secret text,
    scopes text[],
    base_urls text[],
    enabled boolean
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX client_pkey ON client("$id" int4_ops);
