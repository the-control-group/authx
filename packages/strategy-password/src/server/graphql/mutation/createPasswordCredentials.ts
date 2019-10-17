import v4 from "uuid/v4";
import { hash } from "bcrypt";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  Role,
  makeAdministrationScopes
} from "@authx/authx";
import { getIntersection, simplify } from "@authx/scopes";
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
      administration: {
        roleId: string;
        scopes: string[];
      }[];
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
        if (
          !(await a.can(tx, `${realm}:credential.:write.create`)) &&
          !(await a.can(
            tx,
            `${realm}:user.${input.userId}.credentials:write.create`
          )) &&
          !(await a.can(
            tx,
            `${realm}:authority.${input.authorityId}.credentials:write.create`
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }
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
            throw new NotFoundError(
              "No password authority exists with this ID."
            );
          }

          const credential = await PasswordCredential.write(
            tx,
            {
              id,
              enabled: input.enabled,
              authorityId: input.authorityId,
              userId: input.userId,
              authorityUserId: input.userId,
              details: {
                hash: await hash(input.password, authority.details.rounds)
              }
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = makeAdministrationScopes(
            await a.access(tx),
            realm,
            "grant",
            id,
            ["read.basic", "read.details", "write.basic", "write.details"]
          );

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            const role = await Role.read(tx, roleId, { forUpdate: true });

            if (!role.can(tx, "write.scopes")) {
              throw new ForbiddenError(
                `You do not have permission to modify the scopes of role ${roleId}.`
              );
            }

            await Role.write(
              tx,
              {
                ...role,
                scopes: simplify([
                  ...role.scopes,
                  ...getIntersection(possibleAdministrationScopes, scopes)
                ])
              },
              {
                recordId: v4(),
                createdByAuthorizationId: a.id,
                createdAt: new Date()
              }
            );
          }

          await tx.query("COMMIT");
          return credential;
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
