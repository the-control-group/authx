import { PoolClient } from "pg";
import { Token } from "../models";

export interface Context {
  realm: string;
  tx: PoolClient;
  token: null | Token;
}
