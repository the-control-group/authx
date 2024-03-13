import { createClients } from "./createClients.js";
import { updateClients } from "./updateClients.js";
import { GraphQLCreateClientInput } from "./GraphQLCreateClientInput.js";
import { GraphQLUpdateClientInput } from "./GraphQLUpdateClientInput.js";

import { createGrants } from "./createGrants.js";
import { updateGrants } from "./updateGrants.js";
import { GraphQLCreateGrantInput } from "./GraphQLCreateGrantInput.js";
import { GraphQLUpdateGrantInput } from "./GraphQLUpdateGrantInput.js";

import { createRoles } from "./createRoles.js";
import { updateRoles } from "./updateRoles.js";
import { GraphQLCreateRoleInput } from "./GraphQLCreateRoleInput.js";
import { GraphQLUpdateRoleInput } from "./GraphQLUpdateRoleInput.js";

import { createAuthorizations } from "./createAuthorizations.js";
import { updateAuthorizations } from "./updateAuthorizations.js";
import { GraphQLCreateAuthorizationInput } from "./GraphQLCreateAuthorizationInput.js";
import { GraphQLUpdateAuthorizationInput } from "./GraphQLUpdateAuthorizationInput.js";

import { createUsers } from "./createUsers.js";
import { updateUsers } from "./updateUsers.js";
import { GraphQLCreateUserInput } from "./GraphQLCreateUserInput.js";
import { GraphQLUpdateUserInput } from "./GraphQLUpdateUserInput.js";

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
