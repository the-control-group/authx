import { ClientBase } from "pg";

import { User, Role, Authorization } from "@authx/authx";
import {
  PasswordAuthority,
  PasswordCredential
} from "@authx/strategy-password";

interface Metadata {
  recordId: string;
  createdByAuthorizationId: string;
  createdAt: Date;
}

export async function bootstrap(
  tx: ClientBase,
  {
    user,
    authority,
    credential,
    role,
    authorization
  }: {
    user: { data: User; metadata: Metadata };
    authority: { data: PasswordAuthority; metadata: Metadata };
    credential: { data: PasswordCredential; metadata: Metadata };
    role: { data: Role; metadata: Metadata };
    authorization: {
      data: Authorization;
      metadata: Metadata & { createdByCredentialId: null | string };
    };
  }
): Promise<void> {
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
    tx.query("INSERT INTO authx.authorization (id) VALUES ($1)", [
      authorization.data.id
    ])
  ]);

  // insert the records
  await Promise.all([
    User.write(tx, user.data, user.metadata),
    PasswordAuthority.write(tx, authority.data, authority.metadata),
    PasswordCredential.write(tx, credential.data, credential.metadata),
    Role.write(tx, role.data, role.metadata),
    Authorization.write(tx, authorization.data, authorization.metadata)
  ]);
}
