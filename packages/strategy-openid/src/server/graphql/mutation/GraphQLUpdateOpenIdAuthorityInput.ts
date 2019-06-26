import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList
} from "graphql";

export const GraphQLUpdateOpenIdAuthorityInput = new GraphQLInputObjectType({
  name: "UpdateOpenIdAuthorityInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    name: {
      type: GraphQLString,
      description: "The name of the authority."
    },
    description: {
      type: GraphQLString,
      description: "A description of the authority."
    },
    authUrl: {
      type: GraphQLString,
      description: "The URL to which a user is directed to authenticate."
    },
    tokenUrl: {
      type: GraphQLString,
      description:
        "The URL used by AuthX to exchange an authorization code for an access token."
    },
    clientId: {
      type: GraphQLString,
      description: "The client ID of AuthX in with OpenID provider."
    },
    clientSecret: {
      type: GraphQLString,
      description: "The AuthX client secret with the OpenID provider."
    },
    restrictsAccountsToHostedDomains: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description: "Restrict to accounts controlled by these hosted domains."
    },
    emailAuthorityId: {
      type: GraphQLString,
      description: "The ID of the email authority."
    },
    matchesUsersByEmail: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we lookup the user by email address?"
    },
    createsUnmatchedUsers: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we create a new one?"
    },
    assignsCreatedUsersToRoleIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
      description: "When a user is created, assign to these roles."
    }
  })
});

