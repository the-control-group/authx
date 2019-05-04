import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt,
  GraphQLString
} from "graphql";

import { Context } from "../../../../Context";
import { Authority } from "../../../../model";
import { EmailAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLEmailAuthority } from "../GraphQLEmailAuthority";

export const updateEmailAuthority: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    privateKey: null | string;
    addPublicKeys: null | string[];
    removePublicKeys: null | string[];
    proofValidityDuration: null | number;
    authenticationEmailSubject: null | string;
    authenticationEmailText: null | string;
    authenticationEmailHtml: null | string;
    verificationEmailSubject: null | string;
    verificationEmailText: null | string;
    verificationEmailHtml: null | string;
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
    privateKey: {
      type: GraphQLString,
      description:
        "The RS512 private key that will be used to sign the proofs sent to verify ownership of email addresses."
    },
    addPublicKeys: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description:
        "Add a key to the list of RS512 public keys that will be used to verify the proofs sent to verify ownership of email addresses. This allows private keys to be rotated without invalidating current proofs."
    },
    removePublicKeys: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description:
        "Remove a key from the list of RS512 public keys that will be used to verify the proofs sent to verify ownership of email addresses."
    },
    proofValidityDuration: {
      type: GraphQLInt,
      description: "Time in seconds until the email link expires."
    },
    authenticationEmailSubject: {
      type: GraphQLString,
      description:
        "Authentication Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`."
    },
    authenticationEmailText: {
      type: GraphQLString,
      description:
        "Authentication Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`."
    },
    authenticationEmailHtml: {
      type: GraphQLString,
      description:
        "Authentication Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`."
    },
    verificationEmailSubject: {
      type: GraphQLString,
      description:
        "Verification Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`."
    },
    verificationEmailText: {
      type: GraphQLString,
      description:
        "Verification Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`."
    },
    verificationEmailHtml: {
      type: GraphQLString,
      description:
        "Verification Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`."
    }
  },
  async resolve(source, args, context): Promise<EmailAuthority> {
    const {
      tx,
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;

    if (!a) {
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

      if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this authority."
        );
      }

      if (
        (typeof args.privateKey === "string" ||
          args.addPublicKeys ||
          args.removePublicKeys ||
          typeof args.proofValidityDuration === "number" ||
          typeof args.authenticationEmailSubject === "string" ||
          typeof args.authenticationEmailText === "string" ||
          typeof args.authenticationEmailHtml === "string" ||
          typeof args.verificationEmailSubject === "string" ||
          typeof args.verificationEmailText === "string" ||
          typeof args.verificationEmailHtml === "string") &&
        !(await before.isAccessibleBy(realm, a, tx, "write.*"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this authority's details."
        );
      }

      let publicKeys = [...before.details.publicKeys];

      const { addPublicKeys } = args;
      if (addPublicKeys) {
        publicKeys = [...publicKeys, ...addPublicKeys];
      }

      const { removePublicKeys } = args;
      if (removePublicKeys) {
        publicKeys = publicKeys.filter(k => !removePublicKeys.includes(k));
      }

      const authority = await EmailAuthority.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          name: typeof args.name === "string" ? args.name : before.name,
          details: {
            privateKey:
              typeof args.privateKey === "string"
                ? args.privateKey
                : before.details.privateKey,
            publicKeys,
            proofValidityDuration:
              typeof args.proofValidityDuration === "number"
                ? args.proofValidityDuration
                : before.details.proofValidityDuration,
            authenticationEmailSubject:
              typeof args.authenticationEmailSubject === "string"
                ? args.authenticationEmailSubject
                : before.details.authenticationEmailSubject,
            authenticationEmailText:
              typeof args.authenticationEmailText === "string"
                ? args.authenticationEmailText
                : before.details.authenticationEmailText,
            authenticationEmailHtml:
              typeof args.authenticationEmailHtml === "string"
                ? args.authenticationEmailHtml
                : before.details.authenticationEmailHtml,
            verificationEmailSubject:
              typeof args.verificationEmailSubject === "string"
                ? args.verificationEmailSubject
                : before.details.verificationEmailSubject,
            verificationEmailText:
              typeof args.verificationEmailText === "string"
                ? args.verificationEmailText
                : before.details.verificationEmailText,
            verificationEmailHtml:
              typeof args.verificationEmailHtml === "string"
                ? args.verificationEmailHtml
                : before.details.verificationEmailHtml
          }
        },
        {
          recordId: v4(),
          createdByAuthorizationId: a.id,
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
