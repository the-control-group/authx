import { GraphQLObjectType } from "graphql";
import { Context } from "../Context";

import { user } from "./user";
import { users } from "./users";

import { authority } from "./authority";
import { authorities } from "./authorities";

export const GraphQLQuery = new GraphQLObjectType<any, Context>({
  name: "Query",
  description: "The query root of AuthX's GraphQL interface.",
  fields: () => ({
    authority,
    authorities,
    user,
    users
  })
});
