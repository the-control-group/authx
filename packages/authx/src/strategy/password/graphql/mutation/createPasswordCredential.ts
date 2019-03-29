import v4 from "uuid/v4";
import { hash } from "bcrypt";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../../../graphql/Context";
import { Authority } from "../../../../model";
import { PasswordCredential, PasswordAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLPasswordCredential } from "../GraphQLPasswordCredential";

export const createPasswordCredential: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    authorityId: string;
    userId: string;
    password: string;
  },
  Context
> = {
  type: GraphQLPasswordCredential,
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
    password: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The plaintext password to use for this credential."
    }
  },
  async resolve(source, args, context): Promise<PasswordCredential> {
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
      if (!(authority instanceof PasswordAuthority)) {
        throw new NotFoundError("No password authority exists with this ID.");
      }

      const data = new PasswordCredential({
        id,
        enabled: args.enabled,
        authorityId: args.authorityId,
        userId: args.userId,
        authorityUserId: args.userId,
        contact: null,
        details: {
          hash: await hash(args.password, authority.details.rounds)
        }
      });

      if (!(await data.isAccessibleBy(realm, t, tx, "write.*"))) {
        throw new ForbiddenError(
          "You do not have permission to create this credential."
        );
      }

      const credential = await PasswordCredential.write(tx, data, {
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