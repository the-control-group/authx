import { PoolClient } from "pg";
import { Token } from "../models";
import {
  AuthorityData,
  Authority,
  CredentialData,
  Credential
} from "../models";

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
