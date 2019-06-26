import { createClient } from "./createClient";
import { updateClient } from "./updateClient";
import { GraphQLCreateClientInput } from "./GraphQLCreateClientInput";
import { GraphQLUpdateClientInput } from "./GraphQLUpdateClientInput";

import { createGrant } from "./createGrant";
import { updateGrant } from "./updateGrant";
import { GraphQLCreateGrantInput } from "./GraphQLCreateGrantInput";
import { GraphQLUpdateGrantInput } from "./GraphQLUpdateGrantInput";

import { createRole } from "./createRole";
import { updateRole } from "./updateRole";
import { GraphQLCreateRoleInput } from "./GraphQLCreateRoleInput";
import { GraphQLUpdateRoleInput } from "./GraphQLUpdateRoleInput";

import { createAuthorization } from "./createAuthorization";
import { updateAuthorization } from "./updateAuthorization";
import { GraphQLCreateAuthorizationInput } from "./GraphQLCreateAuthorizationInput";
import { GraphQLUpdateAuthorizationInput } from "./GraphQLUpdateAuthorizationInput";

import { createUser } from "./createUser";
import { updateUser } from "./updateUser";
import { GraphQLCreateUserInput } from "./GraphQLCreateUserInput";
import { GraphQLUpdateUserInput } from "./GraphQLUpdateUserInput";

export const mutationFields = {
  createClient,
  updateClient,

  createGrant,
  updateGrant,

  createRole,
  updateRole,

  createAuthorization,
  updateAuthorization,

  createUser,
  updateUser
};

export const mutationTypes = [
  GraphQLCreateClientInput,
  GraphQLUpdateClientInput,

  GraphQLCreateGrantInput,
  GraphQLUpdateGrantInput,

  GraphQLCreateRoleInput,
  GraphQLUpdateRoleInput,

  GraphQLCreateAuthorizationInput,
  GraphQLUpdateAuthorizationInput,

  GraphQLCreateUserInput,
  GraphQLUpdateUserInput
];
