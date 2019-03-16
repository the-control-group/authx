import { GraphQLObjectType } from "graphql";
import { Context } from "../Context";

import { createClient } from "./createClient";
import { updateClient } from "./updateClient";

import { createGrant } from "./createGrant";
import { updateGrant } from "./updateGrant";

import { createRole } from "./createRole";
import { updateRole } from "./updateRole";

import { createToken } from "./createToken";
import { updateToken } from "./updateToken";

import { createUser } from "./createUser";
import { updateUser } from "./updateUser";

export const GraphQLMutation = new GraphQLObjectType<any, Context>({
  name: "Mutation",
  description: "The mutation root of AuthX's GraphQL interface.",
  fields: () => ({
    createClient,
    updateClient,

    createGrant,
    updateGrant,

    createRole,
    updateRole,

    createToken,
    updateToken,

    createUser,
    updateUser
  })
});
