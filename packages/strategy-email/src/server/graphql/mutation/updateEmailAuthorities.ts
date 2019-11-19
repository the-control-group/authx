import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  validateIdFormat
} from "@authx/authx";
import { EmailAuthority } from "../../model";
import { GraphQLEmailAuthority } from "../GraphQLEmailAuthority";
import { GraphQLUpdateEmailAuthorityInput } from "./GraphQLUpdateEmailAuthorityInput";

export const updateEmailAuthorities: GraphQLFieldConfig<
  any,
  {
    authorities: {
      id: string;
      enabled: null | boolean;
      name: null | string;
      description: null | string;
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
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLEmailAuthority),
  description: "Update a new authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateEmailAuthorityInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<EmailAuthority>[]> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an authority."
      );
    }

    return args.authorities.map(async input => {
      // Validate `id`.
      if (!validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        const before = await Authority.read(tx, input.id, authorityMap, {
          forUpdate: true
        });

        if (!(before instanceof EmailAuthority)) {
          throw new NotFoundError(
            "The authority uses a strategy other than email."
          );
        }

        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this authority."
          );
        }

        if (
          (typeof input.privateKey === "string" ||
            input.addPublicKeys ||
            input.removePublicKeys ||
            typeof input.proofValidityDuration === "number" ||
            typeof input.authenticationEmailSubject === "string" ||
            typeof input.authenticationEmailText === "string" ||
            typeof input.authenticationEmailHtml === "string" ||
            typeof input.verificationEmailSubject === "string" ||
            typeof input.verificationEmailText === "string" ||
            typeof input.verificationEmailHtml === "string") &&
          !(await before.isAccessibleBy(realm, a, tx, "write.*"))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this authority's details."
          );
        }

        let publicKeys = [...before.details.publicKeys];

        const { addPublicKeys } = input;
        if (addPublicKeys) {
          publicKeys = [...publicKeys, ...addPublicKeys];
        }

        const { removePublicKeys } = input;
        if (removePublicKeys) {
          publicKeys = publicKeys.filter(k => !removePublicKeys.includes(k));
        }

        const authority = await EmailAuthority.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            name: typeof input.name === "string" ? input.name : before.name,
            description:
              typeof input.description === "string"
                ? input.description
                : before.description,
            details: {
              privateKey:
                typeof input.privateKey === "string"
                  ? input.privateKey
                  : before.details.privateKey,
              publicKeys,
              proofValidityDuration:
                typeof input.proofValidityDuration === "number"
                  ? input.proofValidityDuration
                  : before.details.proofValidityDuration,
              authenticationEmailSubject:
                typeof input.authenticationEmailSubject === "string"
                  ? input.authenticationEmailSubject
                  : before.details.authenticationEmailSubject,
              authenticationEmailText:
                typeof input.authenticationEmailText === "string"
                  ? input.authenticationEmailText
                  : before.details.authenticationEmailText,
              authenticationEmailHtml:
                typeof input.authenticationEmailHtml === "string"
                  ? input.authenticationEmailHtml
                  : before.details.authenticationEmailHtml,
              verificationEmailSubject:
                typeof input.verificationEmailSubject === "string"
                  ? input.verificationEmailSubject
                  : before.details.verificationEmailSubject,
              verificationEmailText:
                typeof input.verificationEmailText === "string"
                  ? input.verificationEmailText
                  : before.details.verificationEmailText,
              verificationEmailHtml:
                typeof input.verificationEmailHtml === "string"
                  ? input.verificationEmailHtml
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
      } finally {
        tx.release();
      }
    });
  }
};
