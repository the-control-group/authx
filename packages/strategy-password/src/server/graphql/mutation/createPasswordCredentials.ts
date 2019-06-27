import v4 from "uuid/v4";
import { hash } from "bcrypt";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError,
  ConflictError
} from "@authx/authx";
import { PasswordCredential, PasswordAuthority } from "../../model";
import { GraphQLPasswordCredential } from "../GraphQLPasswordCredential";
import { GraphQLCreatePasswordCredentialInput } from "./GraphQLCreatePasswordCredentialInput";

export const createPasswordCredentials: GraphQLFieldConfig<
  any,
  {
    credentials: {
      id: null | string;
      enabled: boolean;
      authorityId: string;
      userId: string;
      password: string;
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLPasswordCredential),
  description: "Create a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(
          new GraphQLNonNull(GraphQLCreatePasswordCredentialInput)
        )
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<PasswordCredential>[]> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a credential."
      );
    }

    return args.credentials.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        // Make sure the ID isn't already in use.
        if (input.id) {
          try {
            await PasswordCredential.read(tx, input.id, { forUpdate: true });
            throw new ConflictError();
          } catch (error) {
            if (!(error instanceof NotFoundError)) {
              throw error;
            }
          }
        }

        const id = v4();
        const authority = await Authority.read(
          tx,
          input.authorityId,
          authorityMap
        );
        if (!(authority instanceof PasswordAuthority)) {
          throw new NotFoundError("No password authority exists with this ID.");
        }

        const data = new PasswordCredential({
          id,
          enabled: input.enabled,
          authorityId: input.authorityId,
          userId: input.userId,
          authorityUserId: input.userId,
          details: {
            hash: await hash(input.password, authority.details.rounds)
          }
        });

        if (!(await data.isAccessibleBy(realm, a, tx, "write.*"))) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }

        const credential = await PasswordCredential.write(tx, data, {
          recordId: v4(),
          createdByAuthorizationId: a.id,
          createdAt: new Date()
        });

        await tx.query("COMMIT");
        return credential;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });
  }
};
