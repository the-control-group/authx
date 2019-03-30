import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { EmailAuthority, EmailAuthorityDetails } from "../model";
import { GraphQLAuthority } from "../../../graphql";
import { Context } from "../../../Context";

// Authority
// ---------

export const GraphQLEmailAuthorityDetails = new GraphQLObjectType({
  name: "EmailAuthorityDetails",
  fields: () => ({
    expiresIn: {
      type: GraphQLInt,
      description: "Time in seconds until the email link expires.",
      defaultValue: 900
    },
    authenticationEmailSubject: {
      type: GraphQLString,
      description:
        "Authentication Email Subject. Handlebars template used to generate the email subject. Provided `token`, `credential`, and `url`.",
      defaultValue: "Authenticate by email"
    },
    authenticationEmailText: {
      type: GraphQLString,
      description:
        "Authentication Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `token`, `credential`, and `url`.",
      defaultValue: "Please authenticate at the following URL: {{{url}}}"
    },
    authenticationEmailHtml: {
      type: GraphQLString,
      description:
        "Authentication Email HTML Body. Handlebars template used to generate the email HTML body. Provided `token`, `credential`, and `url`.",
      defaultValue: 'Please click <a href="{{url}}">here</a> to authenticate.'
    },
    verificationEmailSubject: {
      type: GraphQLString,
      description:
        "Verification Email Subject. Handlebars template used to generate the email subject. Provided `token`, `credential`, and `url`.",
      defaultValue: "Verify email"
    },
    verificationEmailText: {
      type: GraphQLString,
      description:
        "Verification Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `token`, `credential`, and `url`.",
      defaultValue: "Please verify this email at the following URL: {{{url}}}"
    },
    verificationEmailHtml: {
      type: GraphQLString,
      description:
        "Verification Email HTML Body. Handlebars template used to generate the email HTML body. Provided `token`, `credential`, and `url`.",
      defaultValue:
        'Please click <a href="{{url}}">here</a> to verify this email.'
    }
  })
});

export const GraphQLEmailAuthority = new GraphQLObjectType<
  EmailAuthority,
  Context
>({
  name: "EmailAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof EmailAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },
    details: {
      type: GraphQLEmailAuthorityDetails,
      async resolve(
        authority,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | EmailAuthorityDetails> {
        return t &&
          (await authority.isAccessibleBy(realm, t, tx, "read.details"))
          ? authority.details
          : null;
      }
    }
  })
});
