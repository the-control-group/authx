import { createClients } from "./createClients";
import { updateClients } from "./updateClients";
import { GraphQLCreateClientInput } from "./GraphQLCreateClientInput";
import { GraphQLUpdateClientInput } from "./GraphQLUpdateClientInput";

import { createGrants } from "./createGrants";
import { updateGrants } from "./updateGrants";
import { GraphQLCreateGrantInput } from "./GraphQLCreateGrantInput";
import { GraphQLUpdateGrantInput } from "./GraphQLUpdateGrantInput";

import { createRoles } from "./createRoles";
import { updateRoles } from "./updateRoles";
import { GraphQLCreateRoleInput } from "./GraphQLCreateRoleInput";
import { GraphQLUpdateRoleInput } from "./GraphQLUpdateRoleInput";

import { createAuthorizations } from "./createAuthorizations";
import { updateAuthorizations } from "./updateAuthorizations";
import { GraphQLCreateAuthorizationInput } from "./GraphQLCreateAuthorizationInput";
import { GraphQLUpdateAuthorizationInput } from "./GraphQLUpdateAuthorizationInput";

import { createUsers } from "./createUsers";
import { updateUsers } from "./updateUsers";
import { GraphQLCreateUserInput } from "./GraphQLCreateUserInput";
import { GraphQLUpdateUserInput } from "./GraphQLUpdateUserInput";

export const mutationFields = {
  createClients,
  updateClients,

  createGrants,
  updateGrants,

  createRoles,
  updateRoles,

  createAuthorizations,
  updateAuthorizations,

  createUsers,
  updateUsers,
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
  GraphQLUpdateUserInput,
];
