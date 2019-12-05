import v4 from "uuid/v4";
import { URL } from "url";
import { randomBytes } from "crypto";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { isSuperset, simplify } from "@authx/scopes";
import { Context } from "../../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client, Role } from "../../model";
import { validateIdFormat } from "../../util/validateIdFormat";
import { createV2AuthXScope } from "../../util/scopes";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../../errors";
import { GraphQLCreateClientInput } from "./GraphQLCreateClientInput";

export const createClients: GraphQLFieldConfig<
  any,
  {
    clients: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      urls: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLClient),
  description: "Create a new client.",
  args: {
    clients: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateClientInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Client>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a client.");
    }

    return args.clients.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `urls`.
      for (const url of input.urls) {
        try {
          new URL(url);
        } catch (error) {
          throw new ValidationError(
            "The provided `urls` list contains an invalid URL."
          );
        }
      }

      // Validate `administration`.
      for (const { roleId } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID."
          );
        }
      }

      const tx = await pool.connect();
      try {
        const values = {
          currentAuthorizationId: a.id,
          currentUserId: a.userId,
          currentGrantId: a.grantId ?? null,
          currentClientId: (await a.grant(tx))?.clientId ?? null
        };

        if (
          !(await a.can(
            tx,
            values,
            createV2AuthXScope(
              realm,
              {
                type: "client",
                clientId: ""
              },
              {
                basic: "*",
                secrets: "*"
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create a client."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Client.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const client = await Client.write(
            tx,
            {
              id,
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              secrets: [randomBytes(16).toString("hex")],
              urls: input.urls
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const clientScopeContext = {
            type: "client" as "client",
            clientId: id
          };

          const grantScopeContext = {
            type: "grant" as "grant",
            clientId: id,
            grantId: "*",
            userId: "*"
          };

          const authorizationScopeContext = {
            type: "authorization" as "authorization",
            authorizationId: "*",
            clientId: id,
            grantId: "*",
            userId: "*"
          };

          const possibleAdministrationScopes = [
            // client ----------------------------------------------------------
            createV2AuthXScope(realm, clientScopeContext, {
              basic: "r",
              secrets: ""
            }),
            createV2AuthXScope(realm, clientScopeContext, {
              basic: "r",
              secrets: "r"
            }),
            createV2AuthXScope(realm, clientScopeContext, {
              basic: "r",
              secrets: "*"
            }),
            createV2AuthXScope(realm, clientScopeContext, {
              basic: "w",
              secrets: ""
            }),
            createV2AuthXScope(realm, clientScopeContext, {
              basic: "w",
              secrets: "w"
            }),
            createV2AuthXScope(realm, clientScopeContext, {
              basic: "w",
              secrets: "*"
            }),
            createV2AuthXScope(realm, clientScopeContext, {
              basic: "*",
              secrets: "*"
            }),

            // grant -----------------------------------------------------------
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "",
              secrets: ""
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "r",
              secrets: ""
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "r"
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "*",
              secrets: "*"
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "",
              secrets: ""
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "",
              secrets: "w"
            }),

            // authorization ---------------------------------------------------
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "",
              secrets: ""
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "r",
              secrets: ""
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "r"
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "*",
              secrets: "*"
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "w",
              scopes: "",
              secrets: ""
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "w",
              scopes: "w",
              secrets: ""
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "w",
              scopes: "",
              secrets: "w"
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "w",
              scopes: "*",
              secrets: "*"
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "*",
              scopes: "*",
              secrets: "*"
            })
          ];

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            const role = await Role.read(tx, roleId, { forUpdate: true });

            if (
              !role.isAccessibleBy(realm, a, tx, {
                basic: "w",
                scopes: "w",
                users: ""
              })
            ) {
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
                  ...possibleAdministrationScopes.filter(possible =>
                    isSuperset(scopes, possible)
                  )
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
          return client;
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
