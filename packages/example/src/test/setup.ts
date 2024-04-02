import Koa from "koa";
import { AuthX, Config, StrategyCollection } from "@authx/authx";

import * as tools from "@authx/tools";
import pg from "pg";
const { Client } = pg;
import { createServer, Server } from "http";
import { URL } from "url";

import email from "@authx/strategy-email";
import password from "@authx/strategy-password";
import openid from "@authx/strategy-openid";

// Load public and private keys from files.
import { readFileSync } from "fs";
const privateKey = readFileSync("private.pem", "utf8");
const publicKey = readFileSync("public.pem", "utf8");

// This is prefixed to postgres database names.
const prefix = "authx-test-";

async function setupDatabase(namespace: string): Promise<{
  database: string;
  teardownDatabase: () => Promise<void>;
}> {
  const database = `${prefix}${Buffer.from(namespace).toString("hex")}`;

  // Postgres supports a max size of 63 bytes for identifiers, and will truncate
  // them accordingly (which is not exactly ideal)...
  if (database.length > 63) {
    throw new Error(
      "The max size of a db name in postgres is 63 bytes. Please use a shorter namespace.",
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
    await tools.schema(client2 as any);
    await tools.fixture(client2 as any, privateKey, publicKey);
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
    },
  };
}

async function setupApp(
  database: string,
  configOverrides: Partial<Config> = {},
): Promise<{ port: number; teardownApp: () => Promise<void> }> {
  // Create a Koa app.
  const app = new Koa();
  app.proxy = true;

  // Create a new instanciate of AuthX.
  const authx = new AuthX({
    realm: "authx",
    base: `http://localhost${process.env.PORT ? `:${process.env.PORT}` : ""}/`,
    codeValidityDuration: 60,
    jwtValidityDuration: 5 * 60,
    privateKey: privateKey,
    publicKeys: [publicKey],
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
      user: process.env.PGUSER ?? undefined,
    },
    maxRequestsPerMinute: null,
    ...configOverrides,
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
          port: 0,
        },
        (): void => {
          const address = server.address();
          if (!address || typeof address === "string") {
            return reject(new Error("Server address is of an unknown type."));
          }

          resolve({ server, port: address.port });
        },
      );
    },
  );

  return {
    port,
    async teardownApp(): Promise<void> {
      // Stop the server.
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) return reject(error);
          resolve();
        });
      });

      // Close postgres connections.
      await authx.pool.end();
    },
  };
}

export async function setup(
  namespace: string,
  configOverrides: Partial<Config> = {},
): Promise<{ url: URL; teardown: () => Promise<void> }> {
  const { database, teardownDatabase } = await setupDatabase(namespace);
  try {
    const { port, teardownApp } = await setupApp(database, configOverrides);
    return {
      url: Object.freeze(new URL(`http://localhost:${port}`)),
      async teardown(): Promise<void> {
        await teardownApp();
        await teardownDatabase();
      },
    };
  } catch (error) {
    await teardownDatabase();
    throw error;
  }
}
