import crypto from "crypto";
import v4 from "uuid/v4";
import { Pool } from "pg";
import bootstrap from "./util/bootstrap";
import { User, Client, Grant, Role } from "./models";

const userId = v4();
const user = new User({
  id: userId,
  enabled: true,
  type: "bot",
  profile: {
    id: userId,
    displayName: "AuthX System",
    connected: false
  }
});

const client = new Client({
  id: v4(),
  enabled: true,
  name: "AuthX Bootstrap",
  oauthSecret: crypto.randomBytes(32).toString("hex"),
  oauthUrls: [],
  userIds: []
});

const grant = new Grant({
  id: v4(),
  enabled: true,
  clientId: client.id,
  userId: user.id,
  nonce: null,
  oauthRefreshToken: crypto.randomBytes(32).toString("hex"),
  scopes: ["AuthX:**:**"]
});

const role = new Role({
  id: v4(),
  enabled: true,
  name: "AuthX Administrator",
  scopes: ["AuthX:**:**"],
  userIds: [user.id]
});

(async () => {
  const pool = new Pool();
  const tx = await pool.connect();

  try {
    await tx.query("BEGIN DEFERRABLE");

    await bootstrap(tx, {
      user: {
        data: user,
        metadata: {
          recordId: v4(),
          createdByTokenId: grant.id,
          createdAt: new Date()
        }
      },
      client: {
        data: client,
        metadata: {
          recordId: v4(),
          createdByTokenId: grant.id,
          createdAt: new Date()
        }
      },
      grant: {
        data: grant,
        metadata: {
          recordId: v4(),
          createdByTokenId: grant.id,
          createdAt: new Date()
        }
      },
      role: {
        data: role,
        metadata: {
          recordId: v4(),
          createdByTokenId: grant.id,
          createdAt: new Date()
        }
      }
    });

    await tx.query("COMMIT");
  } catch (error) {
    console.error(error);
    tx.query("ROLLBACK");
  } finally {
    tx.release();
  }
})();
