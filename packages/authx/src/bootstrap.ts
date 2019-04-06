import { randomBytes } from "crypto";
import { hash } from "bcrypt";
import v4 from "uuid/v4";
import { Pool } from "pg";
import bootstrap from "./util/bootstrap";
import { User, Role, Token } from "./model";
import { PasswordAuthority, PasswordCredential } from "./strategy/password";

(async () => {
  const pool = new Pool();
  const tx = await pool.connect();

  const user = new User({
    id: v4(),
    enabled: true,
    type: "human",
    contact: {
      displayName: "AuthX Root User",
      name: null,
      nickname: null,
      birthday: null,
      anniversary: null,
      gender: null,
      note: null,
      preferredUsername: null,
      utcOffset: null
    }
  });

  const authority = new PasswordAuthority({
    id: v4(),
    enabled: true,
    strategy: "password",
    name: "Password",
    details: {
      rounds: 12
    }
  });

  const password = randomBytes(16).toString("hex");
  const credential = new PasswordCredential({
    id: v4(),
    enabled: true,
    authorityId: authority.id,
    authorityUserId: user.id,
    userId: user.id,
    contact: null,
    details: {
      hash: await hash(password, authority.details.rounds)
    }
  });

  const role = new Role({
    id: v4(),
    enabled: true,
    name: "Super Administrator",
    scopes: ["**:**:**"],
    userIds: [user.id]
  });

  const token = new Token({
    id: v4(),
    enabled: true,
    scopes: ["**:**:**"],
    userId: user.id,
    grantId: null,
    secret: randomBytes(16).toString("hex")
  });

  console.log(`Bootstrapping the following user:
  User ID: ${user.id}
  Password: ${password}
`);

  try {
    await tx.query("BEGIN DEFERRABLE");

    await bootstrap(
      tx,
      {
        user: {
          data: user,
          metadata: {
            recordId: v4(),
            createdByTokenId: token.id,
            createdAt: new Date()
          }
        },
        authority: {
          data: authority,
          metadata: {
            recordId: v4(),
            createdByTokenId: token.id,
            createdAt: new Date()
          }
        },
        credential: {
          data: credential,
          metadata: {
            recordId: v4(),
            createdByTokenId: token.id,
            createdAt: new Date()
          }
        },
        role: {
          data: role,
          metadata: {
            recordId: v4(),
            createdByTokenId: token.id,
            createdAt: new Date()
          }
        },
        token: {
          data: token,
          metadata: {
            recordId: v4(),
            createdByTokenId: token.id,
            createdAt: new Date(),
            createdByCredentialId: null
          }
        }
      },
      process.argv.includes("--schema")
    );

    await tx.query("COMMIT");
  } catch (error) {
    console.error(error);
    tx.query("ROLLBACK");
  } finally {
    tx.release();
    await pool.end();
  }
})().catch(error => console.error(error));
