import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { OpenIdAuthority } from "../model";
import { GraphQLAuthority } from "../../../graphql";
import { Context } from "../../../Context";

// Authority
// ---------

export const GraphQLOpenIdAuthority = new GraphQLObjectType<
  OpenIdAuthority,
  Context
>({
  name: "OpenIdAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof OpenIdAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },

    url: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The URL to which a user is directed to authenticate.",
      resolve(authority): null | string {
        return authority.details.url;
      }
    },
    authorizationCodeUrl: {
      type: new GraphQLNonNull(GraphQLString),
      description:
        "The URL used by AuthX to exchange an authorization code for an access token.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.authorizationCodeUrl
          : null;
      }
    },
    clientId: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The client ID of AuthX in with OpenID provider.",
      resolve(authority): null | string {
        return authority.details.clientId;
      }
    },
    clientSecret: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The AuthX client secret for OpenId.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.clientSecret
          : null;
      }
    }
  })
});
