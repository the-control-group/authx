import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { EmailAuthority } from "../model";
import { GraphQLAuthority } from "../../../graphql";
import { Context } from "../../../Context";

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
    privateKey: {
      type: GraphQLString,
      description:
        "The RS512 private key that will be used to sign the proofs sent to verify ownership of email addresses.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.privateKey
          : null;
      }
    },
    publicKeys: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description:
        "A list of RS512 public keys that will be used to verify the proofs sent to verify ownership of email addresses.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string[]> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.publicKeys
          : null;
      }
    },
    proofValidityDuration: {
      type: GraphQLInt,
      description: "Time in seconds until an email link expires.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | number> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.proofValidityDuration
          : null;
      }
    },
    authenticationEmailSubject: {
      type: GraphQLString,
      description:
        "Authentication Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.authenticationEmailSubject
          : null;
      }
    },
    authenticationEmailText: {
      type: GraphQLString,
      description:
        "Authentication Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.authenticationEmailText
          : null;
      }
    },
    authenticationEmailHtml: {
      type: GraphQLString,
      description:
        "Authentication Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.authenticationEmailHtml
          : null;
      }
    },
    verificationEmailSubject: {
      type: GraphQLString,
      description:
        "Verification Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.verificationEmailSubject
          : null;
      }
    },
    verificationEmailText: {
      type: GraphQLString,
      description:
        "Verification Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.verificationEmailText
          : null;
      }
    },
    verificationEmailHtml: {
      type: GraphQLString,
      description:
        "Verification Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.verificationEmailHtml
          : null;
      }
    }
  })
});
