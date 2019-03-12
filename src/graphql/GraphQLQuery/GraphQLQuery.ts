import { GraphQLObjectType } from "graphql";
import { Context } from "../Context";

import { user } from "./user";
import { users } from "./users";

export const GraphQLQuery = new GraphQLObjectType<any, Context>({
  name: "Query",
  description: "The query root of AuthX's GraphQL interface.",
  fields: () => ({
    user,
    users
  })
});
