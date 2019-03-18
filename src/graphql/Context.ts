import { PoolClient } from "pg";
import { Token } from "../model";
import { AuthorityData, Authority, CredentialData, Credential } from "../model";

export interface Context {
  realm: string;
  tx: PoolClient;
  authorityMap: {
    [key: string]: { new (data: AuthorityData<any>): Authority<any> };
  };
  credentialMap: {
    [key: string]: { new (data: CredentialData<any>): Credential<any> };
  };
  token: null | Token;
}
