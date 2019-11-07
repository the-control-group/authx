import { Pool } from "pg";
import { Authorization } from "./model";
import { StrategyCollection } from "./StrategyCollection";
import { Explanation } from "./util/explanations";

export interface Context {
  readonly realm: string;
  readonly base: string;
  readonly privateKey: string;
  readonly publicKeys: ReadonlyArray<string>;
  readonly codeValidityDuration: number;
  readonly jwtValidityDuration: number;
  readonly sendMail: (options: {
    readonly to: string;
    readonly subject: string;
    readonly text: string;
    readonly html: string;
    readonly from?: string;
  }) => Promise<any>;
  readonly pool: Pool;
  readonly strategies: StrategyCollection;
  readonly authorization: null | Authorization;
  readonly explanations: ReadonlyArray<Explanation>;
}
