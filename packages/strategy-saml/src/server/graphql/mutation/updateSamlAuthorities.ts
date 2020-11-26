import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import {
  Authority,
  Context,
  DataLoaderExecutor,
  ForbiddenError,
  NotFoundError,
  validateIdFormat,
  ValidationError,
} from "@authx/authx";
import { SamlAuthority } from "../../model";
import { GraphQLSamlAuthority } from "../GraphQLSamlAuthority";
import { GraphQLUpdateSamlAuthorityInput } from "./GraphQLUpdateSamlAuthorityInput";

export const updateSamlAuthorities: GraphQLFieldConfig<
  any,
  Context,
  {
    authorities: {
      id: string;
      enabled: null | boolean;
      name: null | string;
      description: null | string;

      entityId: null | string;
      serviceProviderPrivateKey: null | string;
      serviceProviderCertificate: null | string;

      emailAuthorityId: null | string;

      authUrl: null | string;
      identityProviderCertificates: null | string[];

      matchesUsersByEmail: null | boolean;
      createsUnmatchedUsers: null | boolean;
      assignsCreatedUsersToRoleIds: null | string[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLSamlAuthority),
  description: "Update a new authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateSamlAuthorityInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<SamlAuthority>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an authority."
      );
    }

    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const results = args.authorities.map(async (input) => {
      // Validate `id`.
      if (!validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `emailAuthorityId`.
      if (
        typeof input.emailAuthorityId === "string" &&
        !validateIdFormat(input.emailAuthorityId)
      ) {
        throw new ValidationError(
          "The provided `emailAuthorityId` is an invalid ID."
        );
      }

      const tx = await pool.connect();
      try {
        // Make sure this transaction is used for queries made by the executor.
        const executor = new DataLoaderExecutor<Pool | PoolClient>(
          tx,
          strategies
        );

        await tx.query("BEGIN DEFERRABLE");

        const before = await Authority.read(tx, input.id, strategies, {
          forUpdate: true,
        });

        if (!(before instanceof SamlAuthority)) {
          throw new NotFoundError("No Saml authority exists with this ID.");
        }

        if (
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            details: "",
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this authority."
          );
        }

        if (
          (typeof input.entityId !== "undefined" ||
            typeof input.serviceProviderPrivateKey !== "undefined" ||
            typeof input.serviceProviderCertificate !== "undefined" ||
            typeof input.emailAuthorityId !== "undefined" ||
            typeof input.authUrl !== "undefined" ||
            typeof input.identityProviderCertificates !== "undefined" ||
            typeof input.matchesUsersByEmail !== "undefined" ||
            typeof input.createsUnmatchedUsers !== "undefined" ||
            typeof input.assignsCreatedUsersToRoleIds !== "undefined") &&
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            details: "w",
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this authority's details."
          );
        }
        const authority = await SamlAuthority.write(
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
              authUrl:
                typeof input.authUrl === "string"
                  ? input.authUrl
                  : before.details.authUrl,
              emailAuthorityId:
                typeof input.emailAuthorityId === "string"
                  ? input.emailAuthorityId === ""
                    ? null
                    : input.emailAuthorityId
                  : before.details.emailAuthorityId,
              matchesUsersByEmail:
                typeof input.matchesUsersByEmail === "boolean"
                  ? input.matchesUsersByEmail
                  : before.details.matchesUsersByEmail,
              createsUnmatchedUsers:
                typeof input.createsUnmatchedUsers === "boolean"
                  ? input.createsUnmatchedUsers
                  : before.details.createsUnmatchedUsers,
              assignsCreatedUsersToRoleIds: Array.isArray(
                input.assignsCreatedUsersToRoleIds
              )
                ? input.assignsCreatedUsersToRoleIds
                : before.details.assignsCreatedUsersToRoleIds,
              identityProviderCertificates: Array.isArray(
                input.identityProviderCertificates
              )
                ? input.identityProviderCertificates
                : before.details.identityProviderCertificates,
              serviceProviderCertificate:
                typeof input.serviceProviderCertificate === "string"
                  ? input.serviceProviderCertificate
                  : before.details.serviceProviderCertificate,
              serviceProviderPrivateKey:
                typeof input.serviceProviderPrivateKey === "string"
                  ? input.serviceProviderPrivateKey
                  : before.details.serviceProviderPrivateKey,
              entityId:
                typeof input.entityId === "string"
                  ? input.entityId
                  : before.details.entityId,
            },
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date(),
          }
        );

        await tx.query("COMMIT");

        // Clear and prime the loader.
        Authority.clear(executor, authority.id);
        Authority.prime(executor, authority.id, authority);

        return authority;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });

    // Wait for all mutations to succeed or fail.
    await Promise.allSettled(results);

    // Set a new executor (clearing all memoized values).
    context.executor = new DataLoaderExecutor<Pool>(pool, strategies);

    return results;
  },
};
