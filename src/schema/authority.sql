-- Table Definition ----------------------------------------------

CREATE TABLE authority (
    "$id" integer DEFAULT nextval('"authority_$id_seq"'::regclass) PRIMARY KEY,
    "$replaced_by_$id" integer,
    "$created_at" timestamp without time zone,
    "$created_by_user_id" uuid,
    id uuid,
    strategy text,
    name text,
    details jsonb,
    enabled boolean
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX authority_pkey ON authority("$id" int4_ops);
