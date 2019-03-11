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

export interface EmailAuthorityDetails {
  rounds: number;
}

export class EmailAuthority extends Authority<EmailAuthorityDetails> {
  public async credentials(tx: PoolClient): Promise<EmailCredential[]> {
    return EmailCredential.read(
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

export const GraphQLEmailAuthorityDetails = new GraphQLObjectType({
  name: "EmailAuthorityDetails",
  fields: () => ({
    rounds: { type: GraphQLInt }
  })
});

export const GraphQLEmailAuthority = new GraphQLObjectType({
  name: "EmailAuthority",
  interfaces: () => [GraphQLAuthority],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },
    details: { type: GraphQLEmailAuthorityDetails }
  })
});

// Credential
// ----------

export interface EmailCredentialDetails {
  email: string;
}

export class EmailCredential extends Credential<EmailCredentialDetails> {
  public authority(tx: PoolClient): Promise<EmailAuthority> {
    return EmailAuthority.read(tx, this.authorityId);
  }
}

export const GraphQLEmailCredentialDetails = new GraphQLObjectType({
  name: "EmailCredentialDetails",
  fields: () => ({
    email: { type: GraphQLString }
  })
});

export const GraphQLEmailCredential = new GraphQLObjectType({
  name: "EmailCredential",
  interfaces: () => [GraphQLAuthority],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: { type: GraphQLUser },
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    details: { type: GraphQLEmailCredentialDetails },
    profile: { type: GraphQLProfile }
  })
});

const a = Credential.read("" as any, "asdf", {
  email: EmailCredential
});
