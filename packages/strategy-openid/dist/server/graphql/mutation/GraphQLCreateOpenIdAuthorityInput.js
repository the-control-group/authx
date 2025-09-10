import { GraphQLID, GraphQLNonNull, GraphQLString, GraphQLBoolean, GraphQLInputObjectType, GraphQLList, } from "graphql";
import { GraphQLAdministrationInput } from "@authx/authx";
export const GraphQLCreateOpenIdAuthorityInput = new GraphQLInputObjectType({
    name: "CreateOpenIdAuthorityInput",
    fields: () => ({
        id: {
            type: GraphQLID,
            description: "Optional UUID to use for the new authority.",
        },
        enabled: {
            type: GraphQLBoolean,
            defaultValue: true,
        },
        name: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The name of the authority.",
        },
        description: {
            type: new GraphQLNonNull(GraphQLString),
            description: "A description of the authority.",
        },
        authUrl: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The URL to which a user is directed to authenticate.",
        },
        tokenUrl: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The URL used by AuthX to exchange an authorization code for an access token.",
        },
        clientId: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The client ID of AuthX in with OpenID provider.",
        },
        clientSecret: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The AuthX client secret with the OpenID provider.",
        },
        restrictsAccountsToHostedDomains: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))),
            description: "Restrict to accounts controlled by these hosted domains.",
            defaultValue: [],
        },
        emailAuthorityId: {
            type: GraphQLID,
            description: "The ID of the email authority.",
        },
        matchesUsersByEmail: {
            type: GraphQLBoolean,
            description: "If no credential exists for the given OpenID provider, should we lookup the user by email address?",
            defaultValue: false,
        },
        createsUnmatchedUsers: {
            type: GraphQLBoolean,
            description: "If no credential exists for the given OpenID provider, should we create a new one?",
            defaultValue: false,
        },
        assignsCreatedUsersToRoleIds: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
            description: "When a user is created, assign to these roles.",
            defaultValue: [],
        },
        administration: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
            description: "An optional list of roles to which scopes will be added for the purpose of administering the created authority.",
            defaultValue: [],
        },
    }),
});
//# sourceMappingURL=GraphQLCreateOpenIdAuthorityInput.js.map