import { PoolClient } from "pg";
import { Authorization } from "./model";
import { StrategyCollection } from "./StrategyCollection";
import { TracingContext } from "./tracer";

export interface Context {
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
  tx: PoolClient;
  strategies: StrategyCollection;
  authorization: null | Authorization;
  tracing: TracingContext;
}
