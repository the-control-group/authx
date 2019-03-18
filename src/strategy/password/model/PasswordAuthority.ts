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

import { Authority, Credential } from "../../../model";
import { PasswordCredential } from "./PasswordCredential";

// Authority
// ---------

export interface PasswordAuthorityDetails {
  rounds: number;
}

export class PasswordAuthority extends Authority<PasswordAuthorityDetails> {
  private _credentials: null | Promise<PasswordCredential[]> = null;

  public credentials(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<PasswordCredential[]> {
    if (!refresh && this._credentials) {
      return this._credentials;
    }

    return (this._credentials = (async () =>
      PasswordCredential.read(
        tx,
        (await tx.query(
          `
              SELECT entity_id AS id
              FROM authx.credential_records
              WHERE
                authority_id = $1
                AND replacement_record_id IS NULL
              `,
          [this.id]
        )).rows.map(({ id }) => id)
      ))());
  }

  public async credential(
    tx: PoolClient,
    authorityUserId: string
  ): Promise<null | PasswordCredential> {
    const results = await tx.query(
      `
      SELECT entity_id AS id
      FROM authx.credential_record
      WHERE
        authority_id = $1
        AND authority_user_id = $2
        AND enabled = true
        AND replacement_record_id IS NULL
    `,
      [this.id, authorityUserId]
    );

    if (results.rows.length > 1) {
      throw new Error(
        "INVARIANT: There cannot be more than one active credential for the same user and authority."
      );
    }

    if (!results.rows[0]) return null;

    return PasswordCredential.read(tx, results.rows[0].id);
  }
}
