import { GraphQLObjectType } from "graphql";
import { Context } from "../Context";

import { user } from "./user";
import { users } from "./users";

import { client } from "./client";
import { clients } from "./clients";

import { credential } from "./credential";
import { credentials } from "./credentials";

import { authority } from "./authority";
import { authorities } from "./authorities";

export const GraphQLQuery = new GraphQLObjectType<any, Context>({
  name: "Query",
  description: "The query root of AuthX's GraphQL interface.",
  fields: () => ({
    authority,
    authorities,
    client,
    clients,
    credential,
    credentials,
    user,
    users
  })
});
