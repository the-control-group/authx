import { StrategyCollection } from "./StrategyCollection";
import { Strategy } from "./Strategy";

export interface Config {
  realm: string;
  base: string;
  privateKey: string;
  publicKeys: string[];
  codeValidityDuration: number;
  jwtValidityDuration: number;
  sendMail: (options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    from?: string;
  }) => Promise<any>;
  strategies: StrategyCollection | Strategy[];
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
}
