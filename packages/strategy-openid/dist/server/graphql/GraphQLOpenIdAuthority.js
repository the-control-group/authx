import { GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLBoolean, GraphQLList, GraphQLString, } from "graphql";
import { GraphQLAuthority, GraphQLRole, GraphQLNode, } from "@authx/authx";
import { GraphQLEmailAuthority } from "@authx/strategy-email";
import { OpenIdAuthority } from "../model/index.js";
export async function filter(iter, callback) {
    const result = [];
    await Promise.all([...iter].map(async (item, index) => {
        if (await callback(item, index))
            result.push(item);
    }));
    return result;
}
// Authority
// ---------
export const GraphQLOpenIdAuthority = new GraphQLObjectType({
    name: "OpenIdAuthority",
    interfaces: () => [GraphQLNode, GraphQLAuthority],
    isTypeOf: (value) => value instanceof OpenIdAuthority,
    fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        enabled: {
            type: new GraphQLNonNull(GraphQLBoolean),
        },
        name: { type: GraphQLString },
        description: { type: GraphQLString },
        authUrl: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The URL to which a user is directed to authenticate.",
            resolve(authority) {
                return authority.details.authUrl;
            },
        },
        tokenUrl: {
            type: GraphQLString,
            description: "The URL used by AuthX to exchange an authorization code for an access token.",
            async resolve(authority, args, { realm, authorization: a, executor }) {
                return a &&
                    (await authority.isAccessibleBy(realm, a, executor, {
                        basic: "r",
                        details: "r",
                    }))
                    ? authority.details.tokenUrl
                    : null;
            },
        },
        clientId: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The client ID of AuthX in with OpenID provider.",
            resolve(authority) {
                return authority.details.clientId;
            },
        },
        clientSecret: {
            type: GraphQLString,
            description: "The AuthX client secret for OpenId.",
            async resolve(authority, args, { realm, authorization: a, executor }) {
                return a &&
                    (await authority.isAccessibleBy(realm, a, executor, {
                        basic: "r",
                        details: "r",
                    }))
                    ? authority.details.clientSecret
                    : null;
            },
        },
        restrictsAccountsToHostedDomains: {
            type: new GraphQLList(GraphQLString),
            description: "Restrict to accounts controlled by these hosted domains. If empty, accounts from any domain will be allowed.",
            async resolve(authority, args, { realm, authorization: a, executor }) {
                return a &&
                    (await authority.isAccessibleBy(realm, a, executor, {
                        basic: "r",
                        details: "r",
                    }))
                    ? authority.details.restrictsAccountsToHostedDomains
                    : null;
            },
        },
        emailAuthority: {
            type: GraphQLEmailAuthority,
            description: "The email authority.",
            async resolve(authority, args, { realm, authorization: a, executor }) {
                if (!a ||
                    !(await authority.isAccessibleBy(realm, a, executor, {
                        basic: "r",
                        details: "r",
                    }))) {
                    return null;
                }
                const emailAuthority = await authority.emailAuthority(executor);
                return emailAuthority &&
                    (await emailAuthority.isAccessibleBy(realm, a, executor))
                    ? emailAuthority
                    : null;
            },
        },
        matchesUsersByEmail: {
            type: GraphQLBoolean,
            description: "If no credential exists for the given OpenID provider, should we lookup the user by email address?",
            async resolve(authority, args, { realm, authorization: a, executor }) {
                return a &&
                    (await authority.isAccessibleBy(realm, a, executor, {
                        basic: "r",
                        details: "r",
                    }))
                    ? authority.details.matchesUsersByEmail
                    : null;
            },
        },
        createsUnmatchedUsers: {
            type: GraphQLBoolean,
            description: "If no credential exists for the given OpenID provider, should we create a new one?",
            async resolve(authority, args, { realm, authorization: a, executor }) {
                return a &&
                    (await authority.isAccessibleBy(realm, a, executor, {
                        basic: "r",
                        details: "r",
                    }))
                    ? authority.details.createsUnmatchedUsers
                    : null;
            },
        },
        assignsCreatedUsersToRoles: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLRole))),
            description: "When a user is created, assign to these roles.",
            async resolve(authority, args, { realm, authorization: a, executor }) {
                if (!a ||
                    !(await authority.isAccessibleBy(realm, a, executor, {
                        basic: "r",
                        details: "r",
                    }))) {
                    return null;
                }
                return filter(await authority.assignsCreatedUsersToRoles(executor), (role) => role.isAccessibleBy(realm, a, executor));
            },
        },
    }),
});
//# sourceMappingURL=GraphQLOpenIdAuthority.js.map