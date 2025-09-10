import { v4 } from "uuid";
import pg from "pg";
import { GraphQLNonNull, GraphQLList } from "graphql";
import { Authority, ForbiddenError, NotFoundError, ValidationError, validateIdFormat, DataLoaderExecutor, } from "@authx/authx";
import { OpenIdAuthority } from "../../model/index.js";
import { GraphQLOpenIdAuthority } from "../GraphQLOpenIdAuthority.js";
import { GraphQLUpdateOpenIdAuthorityInput } from "./GraphQLUpdateOpenIdAuthorityInput.js";
export const updateOpenIdAuthorities = {
    type: new GraphQLList(GraphQLOpenIdAuthority),
    description: "Update a new authority.",
    args: {
        authorities: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLUpdateOpenIdAuthorityInput))),
        },
    },
    async resolve(source, args, context) {
        const { executor: { strategies, connection: pool }, authorization: a, realm, } = context;
        if (!a) {
            throw new ForbiddenError("You must be authenticated to update an authority.");
        }
        if (!(pool instanceof pg.Pool)) {
            throw new Error("INVARIANT: The executor connection is expected to be an instance of Pool.");
        }
        const results = args.authorities.map(async (input) => {
            // Validate `id`.
            if (!validateIdFormat(input.id)) {
                throw new ValidationError("The provided `id` is an invalid ID.");
            }
            // Validate `emailAuthorityId`.
            if (typeof input.emailAuthorityId === "string" &&
                !validateIdFormat(input.emailAuthorityId)) {
                throw new ValidationError("The provided `emailAuthorityId` is an invalid ID.");
            }
            const tx = await pool.connect();
            try {
                // Make sure this transaction is used for queries made by the executor.
                const executor = new DataLoaderExecutor(tx, strategies);
                await tx.query("BEGIN DEFERRABLE");
                const before = await Authority.read(tx, input.id, strategies, {
                    forUpdate: true,
                });
                if (!(before instanceof OpenIdAuthority)) {
                    throw new NotFoundError("No openid authority exists with this ID.");
                }
                if (!(await before.isAccessibleBy(realm, a, executor, {
                    basic: "w",
                    details: "",
                }))) {
                    throw new ForbiddenError("You do not have permission to update this authority.");
                }
                if ((typeof input.clientId === "string" ||
                    typeof input.clientSecret === "string") &&
                    !(await before.isAccessibleBy(realm, a, executor, {
                        basic: "w",
                        details: "w",
                    }))) {
                    throw new ForbiddenError("You do not have permission to update this authority's details.");
                }
                const authority = await OpenIdAuthority.write(tx, {
                    ...before,
                    enabled: typeof input.enabled === "boolean"
                        ? input.enabled
                        : before.enabled,
                    name: typeof input.name === "string" ? input.name : before.name,
                    description: typeof input.description === "string"
                        ? input.description
                        : before.description,
                    details: {
                        authUrl: typeof input.authUrl === "string"
                            ? input.authUrl
                            : before.details.authUrl,
                        tokenUrl: typeof input.tokenUrl === "string"
                            ? input.tokenUrl
                            : before.details.tokenUrl,
                        clientId: typeof input.clientId === "string"
                            ? input.clientId
                            : before.details.clientId,
                        clientSecret: typeof input.clientSecret === "string"
                            ? input.clientSecret
                            : before.details.clientSecret,
                        restrictsAccountsToHostedDomains: Array.isArray(input.restrictsAccountsToHostedDomains)
                            ? input.restrictsAccountsToHostedDomains
                            : before.details.restrictsAccountsToHostedDomains,
                        emailAuthorityId: typeof input.emailAuthorityId === "string"
                            ? input.emailAuthorityId === ""
                                ? null
                                : input.emailAuthorityId
                            : before.details.emailAuthorityId,
                        matchesUsersByEmail: typeof input.matchesUsersByEmail === "boolean"
                            ? input.matchesUsersByEmail
                            : before.details.matchesUsersByEmail,
                        createsUnmatchedUsers: typeof input.createsUnmatchedUsers === "boolean"
                            ? input.createsUnmatchedUsers
                            : before.details.createsUnmatchedUsers,
                        assignsCreatedUsersToRoleIds: Array.isArray(input.assignsCreatedUsersToRoleIds)
                            ? input.assignsCreatedUsersToRoleIds
                            : before.details.assignsCreatedUsersToRoleIds,
                    },
                }, {
                    recordId: v4(),
                    createdByAuthorizationId: a.id,
                    createdAt: new Date(),
                });
                await tx.query("COMMIT");
                // Clear and prime the loader.
                Authority.clear(executor, authority.id);
                Authority.prime(executor, authority.id, authority);
                return authority;
            }
            catch (error) {
                await tx.query("ROLLBACK");
                throw error;
            }
            finally {
                tx.release();
            }
        });
        // Wait for all mutations to succeed or fail.
        await Promise.allSettled(results);
        // Set a new executor (clearing all memoized values).
        context.executor = new DataLoaderExecutor(pool, strategies);
        return results;
    },
};
//# sourceMappingURL=updateOpenIdAuthorities.js.map