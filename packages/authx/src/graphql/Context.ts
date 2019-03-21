import { PoolClient } from "pg";
import { Token } from "../model";
import { AuthorityData, Authority, CredentialData, Credential } from "../model";

export interface Context {
  realm: string;
  interfaceBaseUrl: string;
  tx: PoolClient;
  authorityMap: {
    [key: string]: { new (data: AuthorityData<any>): Authority<any> };
  };
  credentialMap: {
    [key: string]: { new (data: CredentialData<any>): Credential<any> };
  };
  token: null | Token;
  sendMail: (options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    from?: string;
  }) => Promise<any>;
}
