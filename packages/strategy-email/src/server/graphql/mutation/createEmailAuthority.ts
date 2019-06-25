import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt,
  GraphQLString
} from "graphql";

import { Context, ForbiddenError } from "@authx/authx";
import { EmailAuthority } from "../../model";
import { GraphQLEmailAuthority } from "../GraphQLEmailAuthority";

export const createEmailAuthority: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    description: string;
    privateKey: string;
    publicKeys: string[];
    proofValidityDuration: number;
    authenticationEmailSubject: string;
    authenticationEmailText: string;
    authenticationEmailHtml: string;
    verificationEmailSubject: string;
    verificationEmailText: string;
    verificationEmailHtml: string;
  },
  Context
> = {
  type: GraphQLEmailAuthority,
  description: "Create a new email authority.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The name of the authority."
    },
    description: {
      type: new GraphQLNonNull(GraphQLString),
      description: "A description of the authority."
    },
    privateKey: {
      type: new GraphQLNonNull(GraphQLString),
      description:
        "The RS512 private key that will be used to sign the proofs sent to verify ownership of email addresses."
    },
    publicKeys: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      ),
      description:
        "A list of RS512 public keys that will be used to verify the proofs sent to verify ownership of email addresses."
    },
    proofValidityDuration: {
      type: GraphQLInt,
      description: "Time in seconds until an email link expires.",
      defaultValue: 900
    },
    authenticationEmailSubject: {
      type: GraphQLString,
      description:
        "Authentication Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
      defaultValue: "Authenticate by email"
    },
    authenticationEmailText: {
      type: GraphQLString,
      description:
        "Authentication Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
      defaultValue: "Please authenticate at the following URL: {{{url}}}"
    },
    authenticationEmailHtml: {
      type: GraphQLString,
      description:
        "Authentication Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
      defaultValue: 'Please click <a href="{{url}}">here</a> to authenticate.'
    },
    verificationEmailSubject: {
      type: GraphQLString,
      description:
        "Verification Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
      defaultValue: "Verify email"
    },
    verificationEmailText: {
      type: GraphQLString,
      description:
        "Verification Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
      defaultValue: "Please verify this email at the following URL: {{{url}}}"
    },
    verificationEmailHtml: {
      type: GraphQLString,
      description:
        "Verification Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
      defaultValue:
        'Please click <a href="{{url}}">here</a> to verify this email.'
    }
  },
  async resolve(source, args, context): Promise<EmailAuthority> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authority."
      );
    }

    const tx = await pool.connect();
    try {
      await tx.query("BEGIN DEFERRABLE");
      try {
        const id = v4();
        const data = new EmailAuthority({
          id,
          strategy: "email",
          enabled: args.enabled,
          name: args.name,
          description: args.description,
          details: {
            privateKey: args.privateKey,
            publicKeys: args.publicKeys,
            proofValidityDuration: args.proofValidityDuration,
            authenticationEmailSubject: args.authenticationEmailSubject,
            authenticationEmailText: args.authenticationEmailText,
            authenticationEmailHtml: args.authenticationEmailHtml,
            verificationEmailSubject: args.verificationEmailSubject,
            verificationEmailText: args.verificationEmailText,
            verificationEmailHtml: args.verificationEmailHtml
          }
        });

        if (!(await data.isAccessibleBy(realm, a, tx, "write.*"))) {
          throw new ForbiddenError(
            "You do not have permission to create an authority."
          );
        }

        const authority = await EmailAuthority.write(tx, data, {
          recordId: v4(),
          createdByAuthorizationId: a.id,
          createdAt: new Date()
        });

        await tx.query("COMMIT");
        return authority;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      }
    } finally {
      tx.release();
    }
  }
};
