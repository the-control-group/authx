import Koa from "koa";
import AuthX, { StrategyCollection } from "@authx/authx";
import createAuthXInterface from "@authx/interface";

import email from "@authx/strategy-email";
import password from "@authx/strategy-password";
import openid from "@authx/strategy-openid";

import * as tools from "@authx/tools";
import { Client } from "pg";
import { createServer, Server } from "http";
import { URL } from "url";

//
const prefix = "authx-test-";

async function setupDatabase(
  namespace: string
): Promise<{
  database: string;
  teardownDatabase: () => Promise<void>;
}> {
  const database = `${prefix}${Buffer.from(namespace).toString("hex")}`;

  // Postgres supports a max size of 63 bytes for identifiers, and will truncate
  // them accordingly (which is not exactly ideal)...
  if (database.length > 63) {
    throw new Error(
      "The max size of a db name in postgres is 63 bytes. Please use a shorter namespace."
    );
  }

  // Create the test database.
  const client1 = new Client();
  await client1.connect();
  await client1.query(`CREATE DATABASE "${database}";`);
  await client1.end();

  // Add fixtures to the database.
  const client2 = new Client({ database });
  await client2.connect();
  try {
    await tools.schema(client2);
    await tools.fixture(client2);
  } catch (error) {
    await client2.query(`DROP DATABASE "${database}";`);
    throw error;
  } finally {
    await client2.end();
  }

  return {
    database,
    async teardownDatabase(): Promise<void> {
      // Drop the test database.
      const client = new Client();
      await client.connect();
      await client.query(`DROP DATABASE "${database}";`);
      await client.end();
    }
  };
}

async function setupApp(
  database: string
): Promise<{ port: number; teardownApp: () => Promise<void> }> {
  // Create a Koa app.
  const app = new Koa();
  app.proxy = true;

  // Build the interface middleware.
  const interfaceMiddleware = await createAuthXInterface("authx", [
    "@authx/strategy-email/interface",
    "@authx/strategy-password/interface",
    "@authx/strategy-openid/interface"
  ]);

  // Add the AuthX user interface.
  app.use(interfaceMiddleware);

  // Create a new instanciate of AuthX.
  const authx = new AuthX({
    realm: "authx",
    base: `http://localhost${process.env.PORT ? `:${process.env.PORT}` : ""}/`,
    codeValidityDuration: 60,
    jwtValidityDuration: 5 * 60,
    privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQCfb+nyTPFCntEXbrFPU5DeE0gC4jXRcSFWDfCRgeqeQWqIW9De
MmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/JyUEVIBMF0upDJMA53AFFx+0Fb
/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gKBac/x5qiUn5fh2xM+wIDAQAB
AoGAeOPGo24r0LPTHs1TrC5Uvc4o3+bdn70D5dgT/IBhgTVgrZvQt2nDVPfgc2aw
e1HzVnnbYteoC3xrea4R4lnzGpgcvLYyJ+LEAeRNT66u12EHnCjl8OM5Ods79RO2
pSaGBiAlntq9E86DBJ9ma9lL9NXiokCx4h1ph9rqr6T+DMECQQD7zM56evJj8JyV
kyu7m3PGpepqgMtO4LjHlkU9ZP2HRfrq+bl4yWps1TyCTPzaRujXW+hHJBPsTYar
TmsLcDepAkEAohi3FmYiAMhppgPMFqIr15tY04dKDw4kPgbaQLXT59v9e16alj+2
hsBvMWA/juLuk/2JRuNutY0WBmtkkS42AwJBAKEjS++txniWfl5qNE53CPxTKVTG
31S3EwkG7YCApI5xBkZhUYQuwWCshXCNfDLjthY7xsXgHK/YXRo7sN09DyECQD2W
0HIFSmQrweCfTrtG0Qux7dUpcV05DVI3/lNaAvL05mIqtufhu3OFyHnlTSD4XpgC
XFd/8L+wpK65vVNgUIsCQFO6/fma+fjXx9kG+/zy4C/VwJWFUcpo5Z3R2TF7FheW
5N6OERXoA+Qu+ew7xS6WrAp33dHncIyr9ekkvGc01FU=
-----END RSA PRIVATE KEY-----`,
    publicKeys: [
      `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC
4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy
UEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK
Bac/x5qiUn5fh2xM+wIDAQAB
-----END PUBLIC KEY-----`
    ],
    async sendMail(options: {
      to: string;
      subject: string;
      text: string;
      html: string;
      from?: string;
    }): Promise<void> {
      console.log("--- SENDING EMAIL MESSAGE -------------------------");
      console.log(options);
    },
    strategies: new StrategyCollection([email, password, openid]),
    pg: {
      database,
      host: process.env.PGHOST ?? undefined,
      password: process.env.PGPASSWORD ?? undefined,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
      ssl: process.env.PGSSL === "true" ? true : false,
      user: process.env.PGUSER ?? undefined
    }
  });

  // Apply the AuthX routes to the app.
  app.use(authx.routes());

  // Listen on localhost, allowing the operating system to assign a port.
  const { server, port } = await new Promise<{ server: Server; port: number }>(
    (resolve, reject) => {
      const server = createServer(app.callback());
      server.listen(
        {
          host: "localhost",
          port: 0
        },
        (): void => {
          const address = server.address();
          if (!address || typeof address === "string") {
            return reject(new Error("Server address is of an unknown type."));
          }

          resolve({ server, port: address.port });
        }
      );
    }
  );

  return {
    port,
    async teardownApp(): Promise<void> {
      // Stop the server.
      await new Promise<void>((resolve, reject) => {
        server.close(error => {
          if (error) return reject(error);
          resolve();
        });
      });

      // Close postgres connections.
      await authx.pool.end();
    }
  };
}

export async function setup(
  namespace: string
): Promise<{ url: URL; teardown: () => Promise<void> }> {
  const { database, teardownDatabase } = await setupDatabase(namespace);
  try {
    const { port, teardownApp } = await setupApp(database);
    return {
      url: Object.freeze(new URL(`http://localhost:${port}`)),
      async teardown(): Promise<void> {
        await teardownApp();
        await teardownDatabase();
      }
    };
  } catch (error) {
    await teardownDatabase();
    throw error;
  }
}
