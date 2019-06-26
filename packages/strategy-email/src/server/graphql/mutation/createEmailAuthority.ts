import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import { Context, ForbiddenError } from "@authx/authx";
import { EmailAuthority } from "../../model";
import { GraphQLEmailAuthority } from "../GraphQLEmailAuthority";
import { GraphQLCreateEmailAuthorityInput } from "./GraphQLCreateEmailAuthorityInput";

export const createEmailAuthority: GraphQLFieldConfig<
  any,
  {
    authorities: {
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
    }[];
  },
  Context
> = {
  type: GraphQLEmailAuthority,
  description: "Create a new email authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateEmailAuthorityInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<EmailAuthority>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authority."
      );
    }

    return args.authorities.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");
        const id = v4();
        const data = new EmailAuthority({
          id,
          strategy: "email",
          enabled: input.enabled,
          name: input.name,
          description: input.description,
          details: {
            privateKey: input.privateKey,
            publicKeys: input.publicKeys,
            proofValidityDuration: input.proofValidityDuration,
            authenticationEmailSubject: input.authenticationEmailSubject,
            authenticationEmailText: input.authenticationEmailText,
            authenticationEmailHtml: input.authenticationEmailHtml,
            verificationEmailSubject: input.verificationEmailSubject,
            verificationEmailText: input.verificationEmailText,
            verificationEmailHtml: input.verificationEmailHtml
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
      } finally {
        tx.release();
      }
    });
  }
};
