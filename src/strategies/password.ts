import { PoolClient } from "pg";
import bcrypt from "bcrypt";
import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType
} from "graphql";

import {
  Authority,
  AuthorityData,
  Credential,
  CredentialData
} from "../models";

import {
  GraphQLAuthority,
  GraphQLCredential,
  GraphQLUser,
  GraphQLProfile
} from "../graphql";

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

    const credentialId = results.rows[0];

    return credentialId ? null : PasswordCredential.read(tx, credentialId);
  }
}

export const GraphQLPasswordAuthorityDetails = new GraphQLObjectType({
  name: "PasswordAuthorityDetails",
  fields: () => ({
    rounds: { type: GraphQLInt }
  })
});

export const GraphQLPasswordAuthority = new GraphQLObjectType({
  name: "PasswordAuthority",
  interfaces: () => [GraphQLAuthority],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },
    details: { type: GraphQLPasswordAuthorityDetails }
  })
});

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

export const GraphQLPasswordCredentialDetails = new GraphQLObjectType({
  name: "PasswordCredentialDetails",
  fields: () => ({
    hash: { type: GraphQLString }
  })
});

export const GraphQLPasswordCredential = new GraphQLObjectType({
  name: "PasswordCredential",
  interfaces: () => [GraphQLAuthority],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: { type: GraphQLUser },
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    details: { type: GraphQLPasswordCredentialDetails },
    profile: { type: GraphQLProfile }
  })
});

// Authentication
// --------------

export interface PasswordAuthenticationInput {
  identityAuthorityId: string;
  identityAuthorityUserId: string;
  password: string;
}

export const GraphQLPasswordAuthenticationInput = new GraphQLInputObjectType({
  name: "PasswordAuthenticationInput",
  fields: () => ({
    authorityUserId: { type: new GraphQLNonNull(GraphQLID) },
    password: { type: new GraphQLNonNull(GraphQLString) }
  })
});

export default {
  Authority: PasswordAuthority,
  Credential: PasswordCredential,
  GraphQLAuthority: GraphQLPasswordAuthority,
  GraphQLCredential: GraphQLPasswordCredential,
  GraphQLAuthenticationInput: GraphQLPasswordAuthenticationInput,
  async authenticate(
    namespace: string,
    context: { tx: PoolClient; authorityMap: any },
    authority: PasswordAuthority,
    input: PasswordAuthenticationInput
  ) {
    const { tx } = context;

    // find the user ID given identityAuthorityId and identityAuthorityUserId
    var userId: string | null;
    if (input.identityAuthorityId === authority.id) {
      userId = input.identityAuthorityUserId;
    } else {
      const results = await tx.query(
        `
        SELECT user_id
        FROM authx.credential_record
        WHERE
          authority_id = $1
          AND authority_user_id = $2
          AND enabled = true
          AND replacement_record_id IS NULL
      `,
        [input.identityAuthorityId, input.identityAuthorityUserId]
      );

      if (results.rows.length > 1) {
        throw new Error(
          "INVARIANT: There cannot be more than one active credential with the same authorityId and authorityUserId."
        );
      }

      userId = results.rows.length ? results.rows[0].user_id : null;
    }

    if (!userId) {
      return false;
    }

    // get the credential
    const credential = await authority.credential(tx, userId);
    if (!credential) {
      return false;
    }

    // check the password
    if (!(await bcrypt.compare(input.password, credential.details.hash))) {
      return false;
    }

    return true;
  }
};
