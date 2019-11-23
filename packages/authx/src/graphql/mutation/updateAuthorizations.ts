import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization } from "../../model";
import { ForbiddenError } from "../../errors";
import { GraphQLUpdateAuthorizationInput } from "./GraphQLUpdateAuthorizationInput";

export const updateAuthorizations: GraphQLFieldConfig<
  any,
  {
    authorizations: {
      id: string;
      enabled: null | boolean;
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLAuthorization),
  description: "Update a new authorization.",
  args: {
    authorizations: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateAuthorizationInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Authorization>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a authorization."
      );
    }

    return args.authorizations.map(async input => {
      const tx = await pool.connect();
      try {
        try {
          await tx.query("BEGIN DEFERRABLE");
          const before = await Authorization.read(tx, input.id, {
            forUpdate: true
          });

          if (
            !(await before.isAccessibleBy(realm, a, tx, {
              basic: "w",
              scopes: "",
              secrets: ""
            }))
          ) {
            throw new ForbiddenError(
              "You do not have permission to update this authorization."
            );
          }

          const authorization = await Authorization.write(
            tx,
            {
              ...before,
              enabled:
                typeof input.enabled === "boolean"
                  ? input.enabled
                  : before.enabled
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdByCredentialId: null,
              createdAt: new Date()
            }
          );

          await tx.query("COMMIT");
          return authorization;
        } catch (error) {
          await tx.query("ROLLBACK");
          throw error;
        }
      } finally {
        tx.release();
      }
    });
  }
};
