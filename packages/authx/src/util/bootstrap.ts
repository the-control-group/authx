import { PoolClient } from "pg";
import path from "path";
import fs from "fs";

import { User, Role, Token } from "../model";
import { PasswordAuthority, PasswordCredential } from "../strategy/password";

interface Metadata {
  recordId: string;
  createdByTokenId: string;
  createdAt: Date;
}

export default async (
  tx: PoolClient,
  {
    user,
    authority,
    credential,
    role,
    token
  }: {
    user: { data: User; metadata: Metadata };
    authority: { data: PasswordAuthority; metadata: Metadata };
    credential: { data: PasswordCredential; metadata: Metadata };
    role: { data: Role; metadata: Metadata };
    token: {
      data: Token;
      metadata: Metadata & { createdByCredentialId: null | string };
    };
  },
  schema: boolean = false
) => {
  // set up the schema
  if (schema)
    await tx.query(
      fs
        .readFileSync(path.resolve(__dirname, "../../schema.sql"))
        .toString("utf8")
    );

  // add entities to satisfy foreign key constraints
  await Promise.all([
    tx.query("INSERT INTO authx.user (id) VALUES ($1)", [user.data.id]),
    tx.query("INSERT INTO authx.authority (id) VALUES ($1)", [
      authority.data.id
    ]),
    tx.query("INSERT INTO authx.credential (id) VALUES ($1)", [
      credential.data.id
    ]),
    tx.query("INSERT INTO authx.role (id) VALUES ($1)", [role.data.id]),
    tx.query("INSERT INTO authx.token (id) VALUES ($1)", [token.data.id])
  ]);

  // insert the records
  await Promise.all([
    User.write(tx, user.data, user.metadata),
    PasswordAuthority.write(tx, authority.data, authority.metadata),
    PasswordCredential.write(tx, credential.data, credential.metadata),
    Role.write(tx, role.data, role.metadata),
    Token.write(tx, token.data, token.metadata)
  ]);
};
