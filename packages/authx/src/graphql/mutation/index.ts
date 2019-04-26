import { createClient } from "./createClient";
import { updateClient } from "./updateClient";

import { createGrant } from "./createGrant";
import { updateGrant } from "./updateGrant";

import { createRole } from "./createRole";
import { updateRole } from "./updateRole";

import { createAuthorization } from "./createAuthorization";
import { updateAuthorization } from "./updateAuthorization";

import { createUser } from "./createUser";
import { updateUser } from "./updateUser";

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

export const mutationTypes = [];
