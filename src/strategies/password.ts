import { PoolClient } from "pg";
import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
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

export function authenticate(ctx: any) {}

// Authority
// ---------

export interface PasswordAuthorityDetails {
  rounds: number;
}

export class PasswordAuthority extends Authority<PasswordAuthorityDetails> {
  public async credentials(tx: PoolClient): Promise<PasswordCredential[]> {
    return PasswordCredential.read(
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
    );
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
  password: string;
}

export class PasswordCredential extends Credential<PasswordCredentialDetails> {
  public authority(tx: PoolClient): Promise<PasswordAuthority> {
    return PasswordAuthority.read(tx, this.authorityId);
  }
}

export const GraphQLPasswordCredentialDetails = new GraphQLObjectType({
  name: "PasswordCredentialDetails",
  fields: () => ({
    password: { type: GraphQLString }
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

const a = Credential.read("" as any, "asdf", {
  password: PasswordCredential
});
