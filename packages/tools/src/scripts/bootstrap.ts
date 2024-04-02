import { randomBytes } from "crypto";
import { hash } from "bcrypt";
import { v4 } from "uuid";
import pg from "pg";
import { bootstrap } from "../lib/bootstrap.js";
import { User, Role, Authorization } from "@authx/authx";
import {
  PasswordAuthority,
  PasswordCredential,
} from "@authx/strategy-password";

export default async (): Promise<void> => {
  const pool = new pg.Pool();
  const tx = await pool.connect();

  const user = new User({
    id: v4(),
    recordId: v4(),
    enabled: true,
    type: "human",
    name: "AuthX Root User",
  });

  const authority = new PasswordAuthority({
    id: v4(),
    recordId: v4(),
    enabled: true,
    strategy: "password",
    name: "Password",
    description: "The password authority.",
    details: {
      rounds: 12,
    },
  });

  const password = randomBytes(16).toString("hex");
  const credential = new PasswordCredential({
    id: v4(),
    recordId: v4(),
    enabled: true,
    authorityId: authority.id,
    authorityUserId: user.id,
    userId: user.id,
    details: {
      hash: await hash(password, authority.details.rounds),
    },
  });

  const role = new Role({
    id: v4(),
    recordId: v4(),
    enabled: true,
    name: "Super Administrator",
    description: "A super administrator has full access to all resources.",
    scopes: ["**:**:**"],
    userIds: [user.id],
  });

  const authorization = new Authorization({
    id: v4(),
    recordId: v4(),
    enabled: true,
    scopes: ["**:**:**"],
    userId: user.id,
    grantId: null,
    secret: randomBytes(16).toString("hex"),
  });

  console.log(JSON.stringify({ id: user.id, password: password }));

  try {
    await tx.query("BEGIN DEFERRABLE");

    await bootstrap(tx, {
      user: {
        data: user,
        metadata: {
          recordId: user.recordId,
          createdByAuthorizationId: authorization.id,
          createdAt: new Date(),
        },
      },
      authority: {
        data: authority,
        metadata: {
          recordId: authority.recordId,
          createdByAuthorizationId: authorization.id,
          createdAt: new Date(),
        },
      },
      credential: {
        data: credential,
        metadata: {
          recordId: credential.recordId,
          createdByAuthorizationId: authorization.id,
          createdAt: new Date(),
        },
      },
      role: {
        data: role,
        metadata: {
          recordId: role.recordId,
          createdByAuthorizationId: authorization.id,
          createdAt: new Date(),
        },
      },
      authorization: {
        data: authorization,
        metadata: {
          recordId: authorization.recordId,
          createdByAuthorizationId: authorization.id,
          createdAt: new Date(),
          createdByCredentialId: null,
        },
      },
    });

    await tx.query("COMMIT");
  } catch (error) {
    console.error(error);
    tx.query("ROLLBACK");
  } finally {
    tx.release();
    await pool.end();
  }
};
