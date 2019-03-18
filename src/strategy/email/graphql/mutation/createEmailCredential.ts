import v4 from "uuid/v4";
import { hash } from "bcrypt";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInputObjectType
} from "graphql";

import { Context } from "../../../../graphql/Context";
import { Authority } from "../../../../model";
import { EmailCredential, EmailAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLEmailCredential } from "../GraphQLEmailCredential";

export const GraphQLCreateEmailCredentialDetailsInput = new GraphQLInputObjectType(
  {
    name: "CreateEmailCredentialDetailsInput",
    fields: () => ({
      email: {
        type: new GraphQLNonNull(GraphQLString),
        description: "The plaintext email to use for this credential."
      }
    })
  }
);

export const createEmailCredential: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    authorityId: string;
    userId: string;
    details: {
      email: string;
    };
  },
  Context
> = {
  type: GraphQLEmailCredential,
  description: "Create a new credential.",
  args: {
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    authorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    details: {
      type: new GraphQLNonNull(GraphQLCreateEmailCredentialDetailsInput),
      description: "Credential details, specific to the email strategy."
    }
  },
  async resolve(source, args, context): Promise<EmailCredential> {
    const { tx, token: t, realm, authorityMap } = context;

    if (!t) {
      throw new ForbiddenError(
        "You must be authenticated to create a credential."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const authority = Authority.read(tx, args.authorityId, authorityMap);
      if (!(authority instanceof EmailAuthority)) {
        throw new NotFoundError("No email authority exists with this ID.");
      }

      const data = new EmailCredential({
        id,
        enabled: args.enabled,
        authorityId: args.authorityId,
        userId: args.userId,
        authorityUserId: args.userId,
        contact: null,
        details: {
          hash: await hash(args.details.email, authority.details.rounds)
        }
      });

      if (!(await data.isAccessibleBy(realm, t, tx, "write.*"))) {
        throw new ForbiddenError(
          "You do not have permission to create this credential."
        );
      }

      const credential = await EmailCredential.write(tx, data, {
        recordId: v4(),
        createdByTokenId: t.id,
        createdAt: new Date()
      });

      await tx.query("COMMIT");
      return credential;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
