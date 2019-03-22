import crypto from "crypto";
import v4 from "uuid/v4";
import { Pool } from "pg";
import bootstrap from "./util/bootstrap";
import { User, Client, Grant, Role } from "./model";

const userId = v4();
const user = new User({
  id: userId,
  enabled: true,
  type: "bot",
  contact: {
    displayName: "AuthX System",
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

const client = new Client({
  id: v4(),
  enabled: true,
  name: "AuthX Bootstrap",
  secrets: [crypto.randomBytes(16).toString("hex")],
  urls: [],
  userIds: []
});

const grant = new Grant({
  id: v4(),
  enabled: true,
  clientId: client.id,
  userId: user.id,
  secret: crypto.randomBytes(16).toString("hex"),
  nonces: [],
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
