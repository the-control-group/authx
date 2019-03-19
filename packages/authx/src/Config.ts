export interface Config {
  realm: string;
  pg: {
    database: string;
    host: string;
    idleTimeoutMillis: number;
    max: number;
    password: string;
    port: number;
    ssl: boolean;
    user: string;
  };
  oauthPrivateKey: string;
  oauthPublicKeys: string[];
}
