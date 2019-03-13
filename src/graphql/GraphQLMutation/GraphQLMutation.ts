import { GraphQLObjectType } from "graphql";
import { Context } from "../Context";

import { createClient } from "./createClient";
import { createGrant } from "./createGrant";
import { createRole } from "./createRole";
import { createToken } from "./createToken";
import { createUser } from "./createUser";

export const GraphQLMutation = new GraphQLObjectType<any, Context>({
  name: "Mutation",
  description: "The mutation root of AuthX's GraphQL interface.",
  fields: () => ({
    createClient,
    createGrant,
    createRole,
    createToken,
    createUser
  })
});
