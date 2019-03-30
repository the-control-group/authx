import { PoolClient } from "pg";
import { Token } from "./model";
import { StrategyCollection } from "./StrategyCollection";

export interface Context {
  realm: string;
  interfaceBaseUrl: string;
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
  tx: PoolClient;
  strategies: StrategyCollection;
  token: null | Token;
}
