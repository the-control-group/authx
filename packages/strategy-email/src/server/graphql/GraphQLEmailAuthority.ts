import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { Context, GraphQLAuthority } from "@authx/authx";
import { EmailAuthority } from "../model";

// Authority
// ---------
export const GraphQLEmailAuthority = new GraphQLObjectType<
  EmailAuthority,
  Context
>({
  name: "EmailAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof EmailAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    privateKey: {
      type: GraphQLString,
      description:
        "The RS512 private key that will be used to sign the proofs sent to verify ownership of email addresses.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.privateKey
            : null;
        } finally {
          tx.release();
        }
      }
    },
    publicKeys: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description:
        "A list of RS512 public keys that will be used to verify the proofs sent to verify ownership of email addresses.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.publicKeys
            : null;
        } finally {
          tx.release();
        }
      }
    },
    proofValidityDuration: {
      type: GraphQLInt,
      description: "Time in seconds until an email link expires.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | number> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.proofValidityDuration
            : null;
        } finally {
          tx.release();
        }
      }
    },
    authenticationEmailSubject: {
      type: GraphQLString,
      description:
        "Authentication Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.authenticationEmailSubject
            : null;
        } finally {
          tx.release();
        }
      }
    },
    authenticationEmailText: {
      type: GraphQLString,
      description:
        "Authentication Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.authenticationEmailText
            : null;
        } finally {
          tx.release();
        }
      }
    },
    authenticationEmailHtml: {
      type: GraphQLString,
      description:
        "Authentication Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.authenticationEmailHtml
            : null;
        } finally {
          tx.release();
        }
      }
    },
    verificationEmailSubject: {
      type: GraphQLString,
      description:
        "Verification Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.verificationEmailSubject
            : null;
        } finally {
          tx.release();
        }
      }
    },
    verificationEmailText: {
      type: GraphQLString,
      description:
        "Verification Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.verificationEmailText
            : null;
        } finally {
          tx.release();
        }
      }
    },
    verificationEmailHtml: {
      type: GraphQLString,
      description:
        "Verification Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.verificationEmailHtml
            : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
