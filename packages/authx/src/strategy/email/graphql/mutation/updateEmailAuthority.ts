import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
  GraphQLInputObjectType
} from "graphql";

import { Context } from "../../../../graphql/Context";
import { Authority } from "../../../../model";
import { EmailAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLEmailAuthority } from "../GraphQLEmailAuthority";

export const GraphQLUpdateEmailAuthorityDetailsInput = new GraphQLInputObjectType(
  {
    name: "UpdateEmailAuthorityDetailsInput",
    fields: () => ({
      expiresIn: {
        type: GraphQLInt,
        description: "Time in seconds until the email link expires."
      },
      authenticationEmailSubject: {
        type: GraphQLString,
        description:
          "Authentication Email Subject. Handlebars template used to generate the email subject. Provided `token`, `credential`, and `url`."
      },
      authenticationEmailText: {
        type: GraphQLString,
        description:
          "Authentication Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `token`, `credential`, and `url`."
      },
      authenticationEmailHtml: {
        type: GraphQLString,
        description:
          "Authentication Email HTML Body. Handlebars template used to generate the email HTML body. Provided `token`, `credential`, and `url`."
      },
      verificationEmailSubject: {
        type: GraphQLString,
        description:
          "Verification Email Subject. Handlebars template used to generate the email subject. Provided `token`, `credential`, and `url`."
      },
      verificationEmailText: {
        type: GraphQLString,
        description:
          "Verification Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `token`, `credential`, and `url`."
      },
      verificationEmailHtml: {
        type: GraphQLString,
        description:
          "Verification Email HTML Body. Handlebars template used to generate the email HTML body. Provided `token`, `credential`, and `url`."
      }
    })
  }
);

export const updateEmailAuthority: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    details: null | {
      expiresIn: null | number;
      authenticationEmailSubject: null | string;
      authenticationEmailText: null | string;
      authenticationEmailHtml: null | string;
      verificationEmailSubject: null | string;
      verificationEmailText: null | string;
      verificationEmailHtml: null | string;
    };
  },
  Context
> = {
  type: GraphQLEmailAuthority,
  description: "Update a new authority.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    name: {
      type: GraphQLString,
      description: "The name of the authority."
    },
    details: {
      type: GraphQLUpdateEmailAuthorityDetailsInput,
      description: "Authority details, specific to the email strategy."
    }
  },
  async resolve(source, args, context): Promise<EmailAuthority> {
    const { tx, token: t, realm, authorityMap } = context;

    if (!t) {
      throw new ForbiddenError(
        "You must be authenticated to update an authority."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Authority.read(tx, args.id, authorityMap);

      if (!(before instanceof EmailAuthority)) {
        throw new NotFoundError("No email authority exists with this ID.");
      }

      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this authority."
        );
      }

      if (
        args.details &&
        !(await before.isAccessibleBy(realm, t, tx, "write.details"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this authority's details."
        );
      }

      const authority = await EmailAuthority.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          name: typeof args.name === "string" ? args.name : before.name,
          details: args.details
            ? {
                expiresIn:
                  typeof args.details.expiresIn === "number"
                    ? args.details.expiresIn
                    : before.details.expiresIn,
                authenticationEmailSubject:
                  typeof args.details.authenticationEmailSubject === "string"
                    ? args.details.authenticationEmailSubject
                    : before.details.authenticationEmailSubject,
                authenticationEmailText:
                  typeof args.details.authenticationEmailText === "string"
                    ? args.details.authenticationEmailText
                    : before.details.authenticationEmailText,
                authenticationEmailHtml:
                  typeof args.details.authenticationEmailHtml === "string"
                    ? args.details.authenticationEmailHtml
                    : before.details.authenticationEmailHtml,
                verificationEmailSubject:
                  typeof args.details.verificationEmailSubject === "string"
                    ? args.details.verificationEmailSubject
                    : before.details.verificationEmailSubject,
                verificationEmailText:
                  typeof args.details.verificationEmailText === "string"
                    ? args.details.verificationEmailText
                    : before.details.verificationEmailText,
                verificationEmailHtml:
                  typeof args.details.verificationEmailHtml === "string"
                    ? args.details.verificationEmailHtml
                    : before.details.verificationEmailHtml
              }
            : before.details
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return authority;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
