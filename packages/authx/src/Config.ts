import { Strategy } from "./Strategy";

export interface Config {
  realm: string;
  interfaceBaseUrl: string;
  strategies: Strategy[];
  pg: {
    database?: string;
    host?: string;
    idleTimeoutMillis?: number;
    max?: number;
    password?: string;
    port?: number;
    ssl?: boolean;
    user?: string;
  };
  oauthPrivateKey: string;
  oauthPublicKeys: string[];
  sendMail: (options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    from?: string;
  }) => Promise<any>;
}
