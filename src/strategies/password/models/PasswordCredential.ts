import { PoolClient } from "pg";
import bcrypt from "bcrypt";
import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType
} from "graphql";

import { Authority, Credential } from "../../../models";
import { PasswordAuthority } from "./PasswordAuthority";

// Credential
// ----------

export interface PasswordCredentialDetails {
  hash: string;
}

export class PasswordCredential extends Credential<PasswordCredentialDetails> {
  private _authority: null | Promise<PasswordAuthority> = null;

  public authority(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<PasswordAuthority> {
    if (!refresh && this._authority) {
      return this._authority;
    }

    return (this._authority = PasswordAuthority.read(tx, this.authorityId));
  }
}
