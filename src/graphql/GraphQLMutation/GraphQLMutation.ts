import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLString,
  GraphQLSchema,
  GraphQLList,
  isNamedType,
  GraphQLObjectTypeConfig,
  GraphQLFieldResolver
} from "graphql";

import { GraphQLAuthority } from "../GraphQLAuthority";
import { GraphQLClient } from "../GraphQLClient";
import { GraphQLCredential } from "../GraphQLCredential";
import { GraphQLGrant } from "../GraphQLGrant";
import { GraphQLRole } from "../GraphQLRole";
import { GraphQLTimestamp } from "../GraphQLTimestamp";
import { GraphQLToken } from "../GraphQLToken";
import { GraphQLUser } from "../GraphQLUser";
import { GraphQLUserType } from "../GraphQLUserType";
import { GraphQLProfileInput } from "../GraphQLProfileInput";

import { Context } from "../Context";

export const GraphQLMutation = new GraphQLObjectType<any, Context>({
  name: "Mutation",
  description: "The mutation root of AuthX's GraphQL interface.",
  fields: () => ({
    createAuthority: {
      type: GraphQLAuthority
    },
    updateAuthority: {
      type: GraphQLAuthority
    },
    createClient: {
      type: GraphQLClient
    },
    updateClient: {
      type: GraphQLClient
    },
    createCredential: {
      type: GraphQLCredential
    },
    updateCredential: {
      type: GraphQLCredential
    },
    createGrant: {
      type: GraphQLGrant
    },
    updateGrant: {
      type: GraphQLGrant
    },
    createRole: {
      type: GraphQLRole,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        scopes: {
          type: new GraphQLList(new GraphQLNonNull(GraphQLString))
        }
      }
    },
    updateRole: {
      type: GraphQLRole,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        scopes: {
          type: new GraphQLList(new GraphQLNonNull(GraphQLString))
        }
      }
    },
    assign: {
      type: GraphQLRole,
      args: {
        roleId: { type: new GraphQLNonNull(GraphQLID) },
        userIds: {
          type: new GraphQLNonNull(
            new GraphQLList(new GraphQLNonNull(GraphQLString))
          )
        }
      }
    },
    unassign: {
      args: {
        roleId: { type: new GraphQLNonNull(GraphQLID) },
        userIds: {
          type: new GraphQLNonNull(
            new GraphQLList(new GraphQLNonNull(GraphQLString))
          )
        }
      }
    },
    createToken: {
      type: GraphQLToken
    },
    updateToken: {
      type: GraphQLToken
    },
    createUser: {
      type: GraphQLUser,
      args: {
        type: { type: new GraphQLNonNull(GraphQLUserType) },
        profile: { type: new GraphQLNonNull(GraphQLProfileInput) }
      }
    },
    updateUser: {
      type: GraphQLUser,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        profile: { type: GraphQLProfileInput }
      }
    }
  })
});
